define(["backbone", "jquery", "underscore"], function(Backbone, $, _) {
    var props = window["z"] || {};
    // If the zeb is already initialized then stop initialization of script again and again
    if (props["zebInstance"]) {
        console.log("Zeb is already initialized");
        return props["zebInstance"];
    }

    // constructor of zebjs
    var z = function() {

        // Initialize router definition for z.
        this.initRouterDefinitions();

        this.initModules();

        // Setting initialized to true
        this.isInitialized = true;
    };
    /**
     * Load a service with service name/object, with a callback
     */
    var loadService = function(service, callback, context) {
        var def = $.Deferred();
        var serviceKey = false;
        if (_.isString(service)) {
            serviceKey = service;
        }
        if (_.isObject(service)) {
            console.log(service);
        }
        if (!serviceKey) {
            def.reject();
        }
        if (hasService(serviceKey)) {}

        require([serviceKey], function(serviceClass) {
            var serviceInstance = getService(serviceKey);
            context = context || serviceInstance;
            def.resolveWith(context, [serviceInstance]);
        });

        return def;
    }

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

    /**
     * Router Overrides as we need to add baseURL for the routers
     * base url are necessary for namespacing all urls
     * @type {*|void|extend|extend|extend|extend}
     */
    var router = Backbone.Router.extend({
        route: function(route, name, callback) {

            /**
             * Base if base value is "/" than ignore it as backbone take cares of the route
             * if the base value is a string then, make route as base + / + route
             * if and only if the base & route value are not empty or forward slash
             */
            // Base URL for each module of it is present in form of string or function get its value
            var base = typeof this.baseUrl === 'string' ? this.baseUrl : (typeof this.baseUrl === 'function' ? this.baseUrl() : "");
            // Ignore the base if its value is empty or just a forward slash
            base = base === "/" ? "" : base;
            route = base + ((route !== "" && route !== "/" && base !== "") ? "/" + route : route);

            if (!_.isRegExp(route)) route = this._routeToRegExp(route);
            if (_.isFunction(name)) {
                callback = name;
                name = '';
            }

            // create a closure that 
            var execObj = _.isObject(name) ? name : (_.isObject(callback) ? callback : {});

            if (!_.isEmpty(execObj) && _.isString(execObj["controller"]) && _.isString(execObj["action"])) {
                execObj["module"] = execObj["module"] || this.module;
                var serviceKey = "modules/" + execObj["module"] + "/controllers/" + execObj["controller"];
                callback = function() {
                    loadService(serviceKey).done(function(controller) {
                        if (typeof controller[execObj["action"]] != "undefined") {
                            controller[execObj["action"]].apply(controller);
                        }
                    });
                };

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
    z.prototype.initRouterDefinitions = function() {

        /**
         * Return a closure function that accepts the module name of the router,
         * modify routes according to the module,controller & action
         * and registers it to the database of zeb
         */
        this.router = function(options) {
            return function(moduleName) {
                var r = router.extend(options);
                r.prototype.module = moduleName;
                r.prototype.getModuleName = function() {
                    return this.module;
                };
                (new r);
            };
        };
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
            _.each(arguments, function(r) {
                r(modules[i]);
                i++;
            });
            Backbone.history.start({
                pushState: true
            });
        });
    };

    /**
     * Deferred Manager
     * A stack of deferred are manage, they keep track of model deferreds
     * and service loading deferred.
     */
    var DeferredManager = function() {
        var stack = [];
        var defPrefix = "DEF_";
        this.registerDeferred = function(deferredKey, prefix) {
            var def = $.Deferred(),
                terminated = false,
                localObj = {};
            // decide prefix for deferred 
            prefix = prefix ? (defPrefix + prefix + "_") : defPrefix;
            // Add the uniqueid to the deferred Object
            var _deferred_id = _.uniqueId(prefix);
            def._deferred_id = _deferred_id;
            if (!deferredKey) {
                deferredKey = _deferred_id;
            }
            var stackDeferred = _.findWhere(stack, {
                name: deferredKey
            });
            if (stackDeferred && stackDeferred.instance && _.isFunction(stackDeferred.instance.promise)) {
                console.log("A similiar deferred was registered, hence returning the registered deferrred",
                    " -- Deffered KEY: " + deferredKey);
                return stackDeferred['instance'];
            }
            localObj.o_done = def.done, localObj.o_fail = def.fail,
            localObj.o_then = def.then, localObj.o_always = def.always,
            localObj.o_progress = def.progress, localObj.o_state = def.state;
            localObj.tuples = [
                ["done", "o_done"],
                ["fail", "o_fail"],
                ["always", "o_always"],
                ["progress", "o_progress"]
            ];
            _.each(localObj.tuples, function(tuple) {
                def[tuple[0]] = function() {
                    var args = Array.prototype.slice.call(arguments);
                    flattenArgs = _.flatten(args, true);
                    var finalArgs = [];
                    _.each(flattenArgs, function(a) {
                        if (_.isFunction(a)) {
                            // Wrapped callback
                            var wcb = function() {
                                return terminated ? false : a.apply(def, args);
                            };
                            finalArgs.push(wcb);
                        } else {
                            finalArgs.push(a);
                        }
                    });
                    localObj[tuple[1]].apply(def, finalArgs);
                }
            }, this);
            def.terminate = function() {
                var defObj = _.findWhere(stack, {
                    id: _deferred_id
                });
                defObj.instance = null;
                stack = _.reject(stack, function(stackObj) {
                    return stackObj["id"] == _deferred_id;
                });
                terminated = true;
            };
            def.state = function() {
                return terminated ? "terminated" : localObj["o_state"].apply(def, arguments);
            };
            def.isTerminated = function() {
                return !!terminated;
            };
            stack.push({
                instance: def,
                id: _deferred_id,
                name: deferredKey,
                terminated: terminated
            });
            return def;
        };
        /**
         * Terminate instances according to group name,
         * if no group name is provided than terminate all the instances 
         */ 
        this.terminateAll = function(prefix) {
            prefix = prefix || ""; 
            _.each(stack, function(defObj) {
                if (defObj.instance && _.isFunction(defObj.instance.terminate) && defObj.id.indexOf(defPrefix + prefix) !== -1) {
                    defObj.instance.terminate();
                }
            });
            return this;
        };
        
    };
    // var dm = new DeferredManager;
    // var def = dm.registerDeferred("some_def");
    // var def2 = dm.registerDeferred(null, "DEF");
    // def.done([
    //     _.bind(function() {
    //         console.log(1, this, def.state());
    //     }), [
    //         _.bind(function() {
    //             console.log(2, this, def.state());
    //         }),
    //         _.bind(function() {
    //             console.log(3, this, def.state());
    //         }), [
    //             _.bind(function() {
    //                 console.log(4, this, def.state());
    //             }),
    //             _.bind(function() {
    //                 console.log(5, this, def.state());
    //             }),
    //         ]
    //     ]
    // ]);
    // setTimeout(function() {
    //     dm.terminateAll();
    // }, 1150);
    // setTimeout(function() {
    //     def.resolve();
    // }, 1000);
    // setTimeout(function() {
    //     console.log(dm.getStack());
    //     def.done(function() {
    //         alert("Its again me")
    //     });
    // }, 1200);

    /**
     * Service Class
     * Router & Controller are decorated with the service class
     * Service class maintains singleton pattern and thus only one
     * instance of service class can be initiated
     */
    var ServiceManager = function() {

        // Empty Stack of services
        var stack = {};

        // check if the service already exists
        this.hasService = function(serviceKey) {
            if (typeof stack[serviceKey] == "object" && stack[serviceKey]._service_id) {
                return true;
            }
            return false;
        };
        /**
         * Provided the service key context and deffered
         * resolve the service loading with this function
         */
        var resolveService = function(serviceKey, context, def) {
            def = def || $.Deferred();
            var serviceInstance = getService(serviceKey);
            context = context || serviceInstance;
            def.resolveWith(context, [serviceInstance]);
            return def;
        };

    };

    /** Return ZebJS instance **/
    // Delete the reference of the zebFile and add previous properties to prototype
    delete props["zebFile"];

    // add the properties back to the z
    for (var prop in props) {
        z.prototype[prop] = props[prop];
    };
    props["zebInstance"] = new z();
    return props["zebInstance"];
});