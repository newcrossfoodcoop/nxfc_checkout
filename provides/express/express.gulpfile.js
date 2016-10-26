'use strict';

var gulp = require('gulp');
var path = require('path');
var raml2html = require('gulp-raml2html');

// API documentation from raml
gulp.task('build:provides:express:ramldoc', function() {
    return gulp.src([path.resolve(__dirname, './raml/*.raml')])
        .pipe(raml2html())
        .pipe(gulp.dest(path.resolve(__dirname, './raml/build')));
});
