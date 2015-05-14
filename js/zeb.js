define([], function() {

    // If the zeb is already initialized then stop initialization of script again and again
    if (z.isInitialized) {
        console.log("Zeb is already initialized");
        return z;
    }

    // Take backup of the previous properties
    var props = z;

    // constructor of zebjs
    z = function() {
        // set require configurations
        this.initRequireConfigurations();

        /**
         * require backbone as core functionalites will be overwritten
         */
        var self = this;
        require(["backbone"], function() {
            // Initialize router definition for z.
            self.initRouterDefinitions();

            self.initModules();

            // Setting initialized to true
            self.isInitialized = true;
        });
    };

    /**
     * stop script at any moment while app is running
     */
    z.prototype.stopScript = function(message) {
        for (var i = 10000; i > 0; i--) {
            clearInterval(i);
        }
        var html = '<!DOCTYPE html><html lang="en"><body><p id="zebPreload" style="text-align:center;padding:40px;font-family:Arial,Helvetica,sans-serif;font-size:13px;">' + message + '</p></body></html>';
        document.write(html);
        return true;
    };
    // Initialize the requireJS configurations with url arguments and version dependency
    z.prototype.initRequireConfigurations = function() {
        props.config["urlArgs"] = "bust=" + (props.config["version"] || (new Date).getTime());
        require.config(props.config);
    };
    z.prototype.initRouterDefinitions = function() {
        /**
         * Router Overrides as we need to add baseURL for the routers
         * base url are necessary for namespacing all urls
         * @type {*|void|extend|extend|extend|extend}
         */
        var router = Backbone.Router.extend({
            route: function(route, name, callback) {
            	var base = typeof this.baseUrl === 'string'?this.baseUrl:(typeof this.baseUrl === 'function'?this.baseUrl():"");
                base = base === "/" ? "" : base;
            	route = base + ( (route !== "" && route !== "/" && base !== "")  ? "/" + route: route );
                
                if (!_.isRegExp(route)) route = this._routeToRegExp(route);
                if (_.isFunction(name)) {
                    callback = name;
                    name = '';
                }
                if (!callback) callback = this[name];
                var router = this;
                Backbone.history.route(route, function(fragment) {
                    var args = router._extractParameters(route, fragment);
                    callback && callback.apply(router, args);
                    router.trigger.apply(router, ['route:' + name].concat(args));
                    router.trigger('route', name, args);
                    Backbone.history.trigger('route', router, name, args);
                });
                return this;
            }
        });
	

		/**
		 * Return a closure function that accepts the module name of the router,
		 * modify routes according to the module,controller & action
		 * and registers it to the database of zeb
		 */
        this.makeRouter = function(options) {
            return function (name){
            	var routes = options.routes || {};
            	var finalRoutes = {};
            	_.each(routes, function(name, route){
            		console.log(arguments);
            	});
            	var r = router.extend(options);
            	(new r);
            };
        };
        this.registerRouter = function(){

        }
    };

    /**
     * Initialize routers from every modules that is meant to be loaded
     */
    z.prototype.initModules = function() {
        var modules = props.config.modules || [];
        var routerPaths = [];
        for (var i in modules) {
            routerPaths.push("modules/" + modules[i] + "/router");
        }
        require(routerPaths, function() {
        	var i = 0;
            _.each(arguments, function(r){
            	console.log(modules[i]);
            	r(modules[i]);
            	i++;
            });
            Backbone.history.start({pushState: true});
        });
    };

    // Delete the reference of the zebFile and add previous properties to prototype
    delete props["zebFile"];

    // add the properties back to the z
    for (var prop in props) {
        delete z[prop];
        z.prototype[prop] = props[prop];
    };
    Z = z = new z();
    return z;
});