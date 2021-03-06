/**
 * Initializing the default namespace for the project Munch
 * @type {{}|*}
 */
var z = z || {};

/**
 * Default ENV for which the configurations would be loaded
 * @type {string}
 */

var env = z["config"]? z["config"]["env"] || "local" : "local";
var version = z["config"]? z["config"]["version"] || (new Date()).getTime() : (new Date()).getTime();

z.config = z.config || {};

var config = {
	// Set the enviorment of the application
	env: env,
	// set the version of application
	version: version,
	/**
	 * This can be a relative path to the website, or it can be a CDN path or absolute path
	 * may purely depend on the configuration of the project
	 * In this example we consider it to be an path relative to website,
	 * and the host is diretly pointing to the name of the website
	 */
	baseUrl: "/js/src/",
    /**
     * This will be the url that will be replaced as baseUrl when a build is generated
     */
    buildBaseUrl: "/js/build/",
    /**
     * Wait seconds to avoid timeout errors at low speed
     */
    waitSeconds: 300,
	/**
	 * Path is the basic dependency of the project, like jQuery,
	 * BackboneJS, UnderscoreJS, text plugin etc. All the paths now provided are relative to the baseUrl
	 * thus backbone.js lying on http:www.example.com/js/libs/backbone.js has path of libs/backbone.js
	 * with base url as "js"
	 */
    paths: {
        'jquery': 'libs/jquery',
        'underscore': 'libs/underscore',
        'backbone': 'libs/backbone',
        'zeb': 'libs/zeb',
    },

    /**
     * Dependency manager by requirejs for more details please visit 
     * http://requirejs.org/docs/api.html#config-shim
     */
    shim: {
        'backbone': {
        	deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'zeb': {
        	deps: ['backbone','jquery','underscore'],
        	exports: 'z'
        }
    },
    /**
     * Modules to be loaded in the project, this modules are also used to create bundles of the 
     * javascript files to be loaded when needed
     */
    modules: [
    	'home', 'user', 'product'
    ]
};

// Merge User Settings 
var userConfig = userConfig || {}, compileConfig = compileConfig || {};
function mergeObject(a,b){ var o = {}; for (var i in a) { o[i] = a[i]; } for (var i in b) { o[i] = b[i]; } return o; }

z.config = mergeObject(config, z.config);
z.config = mergeObject(z.config, userConfig);
z.config = mergeObject(z.config, compileConfig);

if(typeof require != "undefined"){
    // Url args according to version and enviornment 
    z.config["urlArgs"] = "bust=" + (z.config["version"] || (new Date).getTime());
    // Initialize require configurations
    require.config(z.config);
    // Require zeb file to proceed forward with the configurations provided
    require(["zeb"]);
}