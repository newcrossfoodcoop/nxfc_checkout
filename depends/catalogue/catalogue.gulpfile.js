'use strict';

var gulp = require('gulp');
var path = require('path');

var raml2code = require('raml2code');
var genJS = require('raml2code-js-client-mulesoft');

// Build clients from RAML
gulp.task('build:catalogue:raml2code', function(){
    return gulp.src([path.resolve(__dirname, './raml/*.raml')])
        .pipe(raml2code({generator: genJS, extra: {}}))
        .pipe(gulp.dest(path.resolve(__dirname, './build')));
});
