define(["backbone", "jquery", "underscore"], function(Backbone, $, _) {
    var props = window["z"] || {};
    // If the zeb is already initialized then stop initialization of script again and again
    if (props["zebInstance"]) {
        console.log("Zeb is already initialized");
        return props["zebInstance"];
    }

    /**
     * Fixes for cross browser compatibility
     */
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    }
    /**
     * Enable support for cross domain
     * @type {boolean}
     */
    $.support.cors = true;

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
                ["then", "o_then"],
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
    var getParams = {};
    /**
     * Update Get Params is a function taken from extraction of http://benalman.com/projects/jquery-bbq-plugin/
     * named as deparam. All credit goes to the author of the plugin
     */
    var updateGetParams = function(d, a) {
        if (!d) {
            d = window.location.search.substring(1);
            if (!d) {
                var hash = window.location.hash;
                d = hash.slice(hash.indexOf('?') + 1);
            }
        }
        var c = {},
            b = {
                "true": !0,
                "false": !1,
                "null": null
            };
        $.each(d.replace(/\+/g, " ").split("&"), function(g, n) {
            var f = n.split("="),
                m = decodeURIComponent(f[0]),
                e, l = c,
                h = 0,
                o = m.split("]["),
                k = o.length - 1;
            if (/\[/.test(o[0]) && /\]$/.test(o[k])) {
                o[k] = o[k].replace(/\]$/, "");
                o = o.shift().split("[").concat(o);
                k = o.length - 1;
            } else {
                k = 0;
            } if (f.length === 2) {
                e = decodeURIComponent(f[1]);
                if (a) {
                    e = e && !isNaN(e) ? +e : e === "undefined" ? undefined : b[e] !== undefined ? b[e] : e;
                }
                if (k) {
                    for (; h <= k; h++) {
                        m = o[h] === "" ? l.length : o[h];
                        l = l[m] = h < k ? l[m] || (o[h + 1] && isNaN(o[h + 1]) ? {} : []) : e;
                    }
                } else {
                    if ($.isArray(c[m])) {
                        c[m].push(e);
                    } else {
                        if (c[m] !== undefined) {
                            c[m] = [c[m], e];
                        } else {
                            c[m] = e;
                        }
                    }
                }
            } else {
                if (m) {
                    c[m] = a ? undefined : "";
                }
            }
        });
        getParams = c;
    };
    // Initialize get params on first load
    updateGetParams();

    /**
     *  General Extend from backbonejs
     *  used for making custom controllers, views and models
     */
    var extend = Backbone.View.extend;
    var Events = Backbone.Events;

    var BaseService = function() {
        this.initialize.apply(this, arguments);
    };
    _.extend(BaseService.prototype, Events, {
        loadService: function(name, callback) {
            return serviceManager.loadService(name, this, callback);
        },
        deferred: function(uniqueName) {
            return deferManager.new.apply(deferManager, arguments);
        },
        /**
         * This is just a replacement for router.navigate/Backbone.history.navigate
         * with default trigger = true, you can still specify the options for trigger
         * as trigger = false
         */
        redirect: function(fragment, options) {
            options = options || {};
            if (!fragment) {
                return false;
            }
            options["trigger"] = typeof options["trigger"] == "undefined" ? true : options["trigger"];
            return Backbone.history.navigate.apply(Backbone.history, [fragment, options]);
        },
        getUrlParam: function(name, defaultValue) {
            defaultValue = typeof defaultValue !== "undefined" ? defaultValue : false;
            if (_.isUndefined(name)) {
                return _.extend({}, getParams);
            }
            if (!_.isUndefined(getParams[name])) {
                return getParams[name];
            }
            return defaultValue;
        },
        beforeRemove: function() {},
        module: "",
        setModuleName: function(moduleName) {
            this.module = moduleName;
            return this;
        },
        getModuleName: function() {
            return this.module;
        }
    });

    // Add extend to Base Service
    BaseService.extend = extend;

    /**
     * Service Manager
     * Router & Controller are decorated with the service class
     * Service class maintains singleton pattern and thus only one
     * instance of service class can be initiated
     */
    var ServiceManager = function(dm) {
        // dm is defer manager instance

        // Empty Stack of services
        var stack = [];

        // check if the service already exists
        var hasService = _.bind(function(serviceKey) {
            var service = _.findWhere(stack, {
                id: serviceKey
            });
            if (service && service.instance) {
                return true;
            }
            return false;
        }, this);
        /**
         * Get instance of service
         * with argument as service key
         */
        getService = _.bind(function(serviceKey) {
            var service = _.findWhere(stack, {
                id: serviceKey
            });
            if (service && service.instance) {
                return service;
            }
            return false;
        }, this);

        /**
         * This method adds the service to the stack
         * Accepts service key as input and service class wrapped with service
         * interface to create an instance and add it to stack
         */
        var addService = _.bind(function(serviceKey, serviceClass) {
            if (hasService(serviceKey)) {
                throw "Service: " + serviceKey + ", already added!";
                return;
            }
            if (typeof serviceClass !== "function" || serviceClass.isService !== true) {
                throw ("Requested service: " + serviceKey + ", is not an appropriate service." +
                    +" Please use convert it to service before using it as a service");
                return;
            }
            var serviceInstance = new serviceClass();
            var serviceObj = {
                id: serviceKey,
                instance: serviceInstance
            };
            stack.push(serviceObj);
            return this;

        }, this);

        // Individual service loader
        var serviceLoader = _.bind(function(serviceKey, context) {
            // Create a deferred for service loading
            var def = dm.new(serviceKey);

            /**
             *  change context to provided context or window
             *  we will later change it to class loaded if no explicit
             *  context is provided
             */
            context = context || window;
            if (!_.isString(serviceKey)) {
                def.rejectWith(context);
            }

            /**
             * If the stack has no such service than load it on demand
             * also as the service is loaded it needs to be a service closure
             * to function properly
             */
            if (!hasService(serviceKey)) {
                /**
                 * load the file that has the service
                 */
                require([serviceKey], _.bind(function(serviceClosure) {
                    /**
                     * As it is currently a hard requirement that service only need to
                     * exists in its respective folder we can get the module name
                     * from the service key though not compulsary
                     */
                    var moduleArr = serviceKey.match("modules*/([a-zA-Z0-9]*)/");
                    var module = null;
                    if (moduleArr && moduleArr.length >= 2) {
                        module = moduleArr[1];
                    }
                    /**
                     * Check if the closure received is an approproate service
                     * closure or not.
                     */
                    if (!serviceClosure || !serviceClosure.isServiceClosure) {
                        throw "Invalid service: " + serviceKey;
                    }
                    serviceClosure(serviceKey, module);
                    context = context || serviceClosure;
                    def.resolveWith(serviceClosure);
                }, this));
            } else {
                var serviceObj = getService(serviceKey);
                context = context || serviceObj.instance;
                def.resolveWith(context, [serviceObj.instance]);
            }
            return def;
        }, this);

        this.loadService = function(serviceArray, callback, context) {
            var def = dm.new();
            if (!_.isFunction(callback) && !_.isObject(callback)) {
                context = callback;
            }
            if (!_.isFunction(callback)) {
                callback = function() {};
            }

            // when defer is resolved execute the callback
            def.done(callback);

            if (_.isString(serviceArray)) {
                serviceArray = [serviceArray];
            }
            if (!_.isArray(serviceArray)) {
                throw "Invalid Service key provided";
            }
            var queue = false;
            _.each(serviceArray, function(serviceKey) {
                if (!queue) {
                    queue = serviceLoader(serviceKey, context);
                } else {
                    queue = queue.then(serviceLoader(serviceKey, context));
                }
            });
            var args = [];
            context = context || window;
            if (queue) {
                queue.then(_.bind(function() {
                    _.each(serviceArray, function(serviceKey) {
                        /**
                         * Terminate the defer created with this service key name for loading
                         */
                        dm.terminateByName(serviceKey);
                        args.push(getService(serviceKey).instance);
                    }, this);
                    def.resolveWith(context, args);
                }, this));
            }
            return def;
        };

        // Returns a class that is acceptable by as a service 
        this.convertToService = function(classDef, props, staticProps) {
            props = props || {};
            staticProps = staticProps || {};
            if (typeof classDef === "object") {
                var allProperties = _.extend({}, classDef, props);
                var genClass = function() {};
                genClass.extend = extend;
                classDef = genClass.extend(allProperties, staticProps);
            }
            if (typeof classDef !== "function") {
                throw "Invalid Class Provided for making a service";
            }
            if (!classDef.extend) {
                classDef.extend = extend;
            }
            var sm = this;
            var serviceClosure = function(serviceKey, moduleName) {
                var serviceClass = classDef;
                if (classDef.isService != true) {
                    _.extend(classDef.prototype, BaseService.prototype);
                    serviceClass = classDef.extend(props, staticProps);
                    serviceClass.isService = true;
                    serviceClass.prototype.module = moduleName;
                }
                var serviceKey = serviceKey || _.uniqueId(moduleName + "_");
                addService(serviceKey, serviceClass);
            };
            serviceClosure.isServiceClosure = true;
            return serviceClosure;
        }
        this.getStack = function() {
            return stack;
        }
    };

    /**
     *  BackboneJS Tweaks
     *  Need to override the navigation part to suppor the CDN
     */

    /**
     *  Save a fragment into the hash history, or replace the URL state if the
     *  'replace' option is passed. You are responsible for properly URL-encoding
     *  the fragment in advance.
     *
     *  The options object can contain `trigger: true` if you wish to have the
     *  route callback be fired (not usually desirable), or `replace: true`, if
     *  you wish to modify the current URL without adding an entry to the history.
     */
    Backbone.History.prototype.navigate = function(fragment, options) {
        updateGetParams();
        if (!Backbone.History.started) return false;
        if (!options || options === true) options = {
            trigger: !!options
        };

        // Normalize the fragment.
        fragment = this.getFragment(fragment || '');

        // Don't include a trailing slash on the root.
        var root = this.root;
        if (fragment === '' || fragment.charAt(0) === '?') {
            root = root.slice(0, -1) || '/';
        }
        var url = root + fragment;

        var pathStripper = /#.*$/;

        // Strip the hash and decode for matching.
        fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

        if (this.fragment === fragment) return;
        this.fragment = fragment;

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._usePushState) {
            try {
                var dummyUrl = new URL(url);
            } catch (ex) {
                url = window.location.origin + url;
            }
            this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {
            this._updateHash(this.location, fragment, options.replace);
            if (this.iframe && (fragment !== this.getHash(this.iframe))) {
                // Opening and closing the iframe tricks IE7 and earlier to push a
                // history entry on hash-tag change.  When replace is true, we don't
                // want this.
                if (!options.replace) this.iframe.document.open().close();
                this._updateHash(this.iframe.location, fragment, options.replace);
            }

            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return this.location.assign(url);
        }
        if (options.trigger) return this.loadUrl(fragment);
    };

    /**
     * Router Overrides as we need to add baseURL for the routers
     * base url are necessary for namespacing all urls
     * @type {*|void|extend|extend|extend|extend}
     */
    var router = Backbone.Router.extend({
        route: function(route, name, callback) {

            if (_.isString(route)) {
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
            }

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
                    var args = Array.slice(arguments);
                    // Discard the query string
                    args.pop();

                    serviceManager.loadService(serviceKey).done(function(controller) {
                        controller.setRouteParam(args);
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

    /**
     * Custom controllers for handling the layout, views & deferreds with
     * base url are necessary for namespacing all urls
     * @type {*|void|extend|extend|extend|extend}
     */
    var controller = function() {};
    _.extend(controller.prototype, Events, {
        routeParams: {},
        getRouteParam: function(name, defaultValue) {
            defaultValue = typeof defaultValue !== "undefined" ? defaultValue : false;
            if (_.isUndefined(name)) {
                return _.extend({}, this.routeParams);
            }
            if (typeof this.routeParams[name] === "undefined") {
                return defaultValue;
            }
            return this.routeParams[name];
        },
        setRouteParam: function(setter, value) {
            if (_.isObject(setter)) {
                this.routeParams = {};
                _.extend(this.routeParams, {}, setter);
                return this;
            }
            if(_.isString(setter)) {
                this.routeParams[setter] = value;
                return this;
            }
            throw "Invalid route value to set";
        }
    });


    // Instance of Deferred Manager
    var deferManager = new DeferManager("ZEBJS");

    // Instance of Service Manager
    var serviceManager = new ServiceManager(deferManager);

    // constructor of zebjs
    var z = function() {

        // Initialize class definition for z.
        // mainly consist of router, controller, model, view
        this.initClassDefinitions();

        // Initialize modules accordingly
        this.initModules();

        // Setting initialized to true
        this.isInitialized = true;
    };

    _.extend(z.prototype, Events, {
        /**
         * stop script at any moment while app is running
         */
        stopScript: function(message) {
            for (var i = 10000; i > 0; i--) {
                clearInterval(i);
            }
            var html = '<!DOCTYPE html><html lang="en"><body><p id="zebPreload" style="text-align:center;padding:40px;font-family:Arial,Helvetica,sans-serif;font-size:13px;">' + message + '</p></body></html>';
            document.write(html);
            return true;
        },
        initClassDefinitions: function() {
            /**
             * Return a registerable instance of router
             */
            this.router = function(props, staticProps) {
                var rs = serviceManager.convertToService(router, props, staticProps);
                return rs;
            };

            /**
             * Return a registerable instance of router
             */
            this.controller = function(props, staticProps) {
                var cs = serviceManager.convertToService(controller, props, staticProps);
                return cs;
            }
        },
        /**
         * Initialize routers from every modules that is meant to be loaded
         */
        initModules: function() {
            var modules = props.config.modules || [];
            var routerPaths = [];
            for (var i in modules) {
                routerPaths.push("modules/" + modules[i] + "/router");
            }
            serviceManager.loadService(routerPaths, function() {
                Backbone.history.start({
                    pushState: true
                });
            });
        }
    });

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