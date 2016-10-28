'use strict';

var config = require('config');

var _ = require('lodash');
var chalk = require('chalk');
var glob = require('glob');
var path = require('path');
var util = require('util');
var url = require('url');

/** 
 * processConfig(args)
 *
 * module: module name
 * moduleGroup: defaults to 'depends'
 * defaultConfig:
 * passedConfig:
 */

module.exports.processConfig = function processConfig (args) {

    var defaultConfig = config.util.extendDeep(args.defaultConfig, args.passedConfig);
    var module = args.module;
    var group = args.moduleGroup || 'depends';

    // Merge and attach config to global config
    var moduleConfig = {};
    moduleConfig[module] = defaultConfig;
    config.util.setModuleDefaults(group, moduleConfig);
    
    // Process environment varible substitutions
    if (config[group][module].env) {
        var customEnv = {};
        customEnv[group] = {};
        customEnv[group][module] = config[group][module].env;

        var substitutions = config.util.substituteDeep(customEnv, process.env);
        config.util.extendDeep(config, substitutions);
    }
    
    // Process deferred configuration
    config.util.resolveDeferredConfigs(config[group][module]);
    
    // The config module doesn't set NODE_ENV so if we're not running in the
    // app context it won't log
    if (process.env.NODE_ENV === 'development') {
        console.log(chalk.yellow('Config for ',chalk.bold(group,'/',module),':'),util.inspect(config[group][module]));
    }
};


/**
 * deferredSetUrl()
 */

module.exports.deferredSetUrl = function deferredSetUrl(param) {

    var hrefParam;
    if (param) {
        hrefParam = param + 'Href';
    }
    else {
        param = 'url';
        hrefParam = 'href';
    }

    var customizer = function customizer(objValue, srcValue) {
        return _.isNull(objValue) ? srcValue : objValue;
    };
 
    var defaults = _.partialRight(_.assignInWith, customizer);

    var defer = require('config/defer').deferConfig;

    return defer(function() {

        var cfg = this;
        
        if (!cfg[param].pathname && cfg.pathnameFmt) {
            cfg[param].pathname = util.format(
                cfg.pathnameFmt,
                cfg.name,
                config.nodeEnvShort
            );
        }
        
        var base = cfg[param];
        if (cfg[hrefParam]) {            
            var parsed = url.parse(cfg[hrefParam]);
            cfg[param] = url.parse(url.format(defaults(parsed,base)));
        }
        else {
            cfg[param] = defaults(new url.Url(),base);
            cfg[param] = url.parse(url.format(defaults(new url.Url(),base)));
        }

        cfg[hrefParam] = url.format(cfg[param]);
        
        //return base;
        return null;
    });
};
