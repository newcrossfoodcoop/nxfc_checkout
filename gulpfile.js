'use strict';

/**
 * Module dependencies
 */
var _ = require('lodash'),
	gulp = require('gulp'),
	gulpLoadPlugins = require('gulp-load-plugins'),
	runSequence = require('run-sequence'),
	plugins = gulpLoadPlugins(),
	args = require('get-gulp-args')();
	
var chalk = require('chalk');
var config = require('config');
var util = require('util');

var path = require('path');
var ramlParser = require('raml-parser');

function pickArgs (names,defaults) {
    return _(args)
        .keys()
        .intersection(names)
        .map(function(k){
            if (typeof(args[k]) !== 'boolean') { return '--' + k + '=' + args[k]; }
            if (_.has(defaults,k)) { return '--' + k + '=' + defaults[k]; }
            return '--' + k;
        })
        .valueOf();
}

function runMatchingSequence(regex) {
    return function(done) {
        var tasks = _(gulp.tasks)
            .keys()
            .filter(function (key) { return regex.test(key); })
            .valueOf();
        
        if (tasks.length) {   
            runSequence(tasks,done);
        }
        else {
            console.log(chalk.yellow('No matching tasks found: '),regex);
            done();
        }
    };
}

// Set NODE_ENV to 'test'
gulp.task('env:test', function () {
	process.env.NODE_ENV = 'test';
});

// Set NODE_ENV to 'development'
gulp.task('env:dev', function () {
	process.env.NODE_ENV = 'development';
});

// Set NODE_ENV to 'production'
gulp.task('env:prod', function () {
	process.env.NODE_ENV = 'production';
});

// Set NODE_ENV to 'stage'
gulp.task('env:stage', function () {
	process.env.NODE_ENV = 'stage';
});

// Nodemon task
gulp.task('nodemon', function () {
	return plugins.nodemon({
		script: 'provides/express',
		nodeArgs: pickArgs(['debug']),
		ext: 'js,html,json',
		watch: ['provides','depends','config','package.json','lib']
	});
});

gulp.task('node', function () {
    var spawn = require('child_process').spawn;
    
    var nodeArgs = _(['provides/express'])
        .union(pickArgs(['debug', 'spawn_stack-size', 'spawn_max_old_space_size']))
        .map(function(k) { return _.replace(k,'spawn_',''); } )
        .valueOf();
    
    console.log('spawning: node',nodeArgs);
    spawn('node', nodeArgs, {stdio: 'inherit'}); 
});

// JS linting task
gulp.task('jshint', function () {
	return gulp.src(['!**/node_modules/**/*.js', '!**/build/**/*.js', '**/*.js'])
		.pipe(plugins.jshint())
		.pipe(plugins.jshint.reporter('default'))
		.pipe(plugins.jshint.reporter('fail'));
});

// RAML linting task
gulp.task('ramllint', function() {
    return gulp.src(['!**/node_modules/**/*.raml', '**/*.raml', ])
        .pipe(plugins.fn(function (file) {
            ramlParser.loadFile(file.path).then( function(data) {
                console.log(chalk.green('OK:  '), data.title);
            }, function(error) {
                console.log(chalk.red('ERR: '), file.path, ' ', error);
            });
        }));
});

// Mocha tests task
gulp.task('mocha', function () {
	return gulp.src(['!**/node_modules/**/*.js', '**/tests/mocha/*.js'])
		.pipe(plugins.mocha({
			reporter: 'spec',
			timeout: 4000
		}));
});

// Run the project linting
gulp.task('lint', function(done) {
	runSequence('jshint', 'ramllint', done);
});

// Run the project tests
gulp.task('test', function(done) {
	runSequence('env:test', 'lint', 'mocha', done);
});

// Run the project in development mode
gulp.task('default', function(done) {
	runSequence('env:dev', 'lint', 'build', 'nodemon', done);
});

// Run the project in production mode
gulp.task('prod', function(done) {
	runSequence('env:prod', 'node', done);
});

// Run the project in stage mode
gulp.task('stage', function(done) {
	runSequence('env:stage', 'node', done);
});

// Run the project in test mode
gulp.task('test:express', function(done) {
	runSequence('env:test', 'node', done);
});

gulp.task('loadModuleTasks', function () {
    return gulp.src(['./depends/*/*gulpfile.js','./provides/*/*gulpfile.js'])
        .pipe(plugins.fn(function(file) {
            console.log('Loading tasks: ', chalk.blue(file.path));
            require(file.path); 
        }));
});

gulp.task('build', ['loadModuleTasks'], runMatchingSequence(/^build\:/));


