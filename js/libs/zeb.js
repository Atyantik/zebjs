define(["backbone", "jquery", "underscore"], function(Backbone, $, _) {
    var props = window["z"] || {};
    // If the zeb is already initialized then stop initialization of script again and again
    if (props["zebInstance"]) {
        console.log("Zeb is already initialized");
        return props["zebInstance"];
    }

    /**
     * Deferred Manager
     * A stack of deferred are manage, they keep track of model deferreds
     * and service loading deferred.
     */
    var DeferManager = function(namespace) {
        var stack = [];
        var defPrefix = (namespace || "ZEBJS") + "_";
        this.registerDefer = function(name, prefix) {
            var def = $.Deferred(),
                terminated = false,
                localObj = {};
            // decide prefix for deferred 
            prefix = prefix ? (defPrefix + prefix + "_") : defPrefix;
            // Add the uniqueid to the deferred Object
            var _deferred_id = _.uniqueId(prefix);
            def._deferred_id = _deferred_id;
            if (!name) {
                name = _deferred_id;
            }
            var stackDeferred = _.findWhere(stack, {
                name: name
            });
            if (stackDeferred && stackDeferred.instance && _.isFunction(stackDeferred.instance.promise)) {
                console.log("A similiar deferred was registered, hence returning the registered deferrred",
                    " -- Deffered Name: " + name);
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
                            //console.log(a.toString());
                            var wcb = function() {
                                return terminated ? false : a.apply(def, arguments);
                            };
                            finalArgs.push(wcb);
                        } else {
                            finalArgs.push(a);
                        }
                    });
                    //console.log(finalArgs);
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
                name: name,
                terminated: terminated
            });
            return def;
        };

        // Synonym for better operation
        this.new = this.registerDefer;
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
        this.terminateById = function(id) {
            var defObj = _.findWhere(stack, {
                id: id
            });
            if (defObj && defObj.instance && defObj.instance.terminate) {
                defObj.instance.terminate();
                return true;
            }
            return false;
        };
        this.terminateByName = function(name) {
            var defObj = _.findWhere(stack, {
                name: name
            });
            if (defObj && defObj.instance && defObj.instance.terminate) {
                defObj.instance.terminate();
                return true;
            }
            return false;
        }
        this.getStack = function() {
            return stack;
        }
    };

    /**
     * Service Manager
     * Router & Controller are decorated with the service class
     * Service class maintains singleton pattern and thus only one
     * instance of service class can be initiated
     */
    var BaseService = function(serviceManager) {
        this.loadService = function(name, callback) {
            return serviceManager.loadService(name, this, callback);
        }
        this.deferred = function(uniqueName) {
            
        }
    };
    // Add extend to Base Service
    BaseService.extend = Backbone.View.extend;
    var ServiceManager = function(dm) {
        // dm is deref manager innstance

        // Empty Stack of services
        var stack = [];

        // check if the service already exists
        this.hasService = function(serviceKey) {
            var service = _.findWhere(stack, {
                id: serviceKey
            });
            if (service && service.instance) {
                return true;
            }
            return false;
        };
        /**
         * Provided the service key context and deffered
         * resolve the service loading with this function
         */
        var resolveService = _.bind(function(serviceKey, context, def) {
            def = def || dm.new();
            var serviceInstance = this.getService(serviceKey);
            context = context || serviceInstance.instance;

            //def.done(function(controller){
            //console.log(controller.toString());
            //});

            def.resolveWith(context, [serviceInstance.instance]);

            return def;
        }, this);
        /**
         * Get instance of service
         * with argument as service key
         */
        this.getService = function(serviceKey) {
            var service = _.findWhere(stack, {
                id: serviceKey
            });
            if (service && service.instance) {
                return service;
            }
            return false;
        };
        this.registerService = function(serviceKey, serviceClass) {
            if (this.hasService(serviceKey)) {
                throw "Service: " + serviceKey + ", already registered!";
                return;
            }
            if (typeof serviceClass !== "function") {
                throw "Requested service: " + serviceKey + ", is not a class";
                return;
            }
            var instance = new serviceClass();
            var serviceObj = {
                id: serviceKey,
                instance: instance
            };
            stack.push(serviceObj);
            return this;

        };
        this.loadService = function(serviceKey, context, callback) {
            // Create a deferred for service loading
            var def = dm.new();

            /**
             *  change context to provided context or window
             *  we will later change it to class loaded if no explicit
             *  context is provided
             */
            context = context || window;
            if (!_.isString(serviceKey)) {
                def.rejectWith(context);
            }

            if (this.hasService(serviceKey)) {
                resolveService(serviceKey, context, def);
            } else {
                require([serviceKey], _.bind(function(serviceClass) {
                    this.registerService(serviceKey, serviceClass);
                    resolveService(serviceKey, context, def);
                }, this));
            }
            return def;
        };
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
                    serviceManager.loadService(serviceKey).done(function(controller) {
                        //                        console.log(controller.toString());
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

    // Instance of Deferred Manager
    var deferManager = new DeferManager("ZEBJS");

    // Instance of Service Manager
    var serviceManager = new ServiceManager(deferManager);

    // constructor of zebjs
    var z = function() {

        // Initialize router definition for z.
        this.initRouterDefinitions();

        this.initModules();

        // Setting initialized to true
        this.isInitialized = true;
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