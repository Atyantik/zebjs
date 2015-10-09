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
                if (defObj && defObj.instance) {
                    if (typeof defObj.instance.abort === "function") {
                        defObj.instance.abort.call(defObj.instance);
                    }
                    defObj.instance = null;
                    stack = _.reject(stack, function(stackObj) {
                        return stackObj["id"] == _deferred_id;
                    });
                    terminated = true;
                }
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
            console.log("Terminating all by prefix: " + prefix, "-----", stack);
            prefix = prefix || "";
            var terminated = 0;
            _.each(stack, function(defObj) {
                if (defObj.instance && _.isFunction(defObj.instance.terminate) && defObj.id.indexOf(defPrefix + prefix) !== -1) {
                    defObj.instance.terminate();
                    terminated++;
                }
            });
            console.log(terminated + " defer terminated");
            return terminated;
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
            return serviceManager.loadService(name, callback, this);
        },
        defer_prefix: "",
        /**
         * Create a deferred with the help of deferManager
         * The created deferred has prefix of the serviceKey or custom set deferPrefix
         * with the help of setDeferPrefix
         */
        deferred: function(uniqueName) {
            var args = [
                uniqueName,
                this.getDeferPrefix()
            ];
            return deferManager.new.apply(deferManager, args);
        },
        /**
         * Set custom defer prefix for the deferred functionality of the service
         * If the defer prefix is previously set then you need to pass parameter
         * forceSet as true, cause the idea of using the setDeferPrefix is to set the prefix just once
         * without a restriction to set the prefix runtime
         *
         */
        setDeferPrefix: function(deferPrefix, forceSet) {
            forceSet = typeof forceSet !== "undefined" ? !!forceSet : false;
            if (_.isEmpty(deferPrefix)) {
                throw "Invalid Defer Prefix: " + deferPrefix;
                return false;
            }
            if (forceSet) {
                this.defer_prefix = deferPrefix;
            }
            return this;
        },
        /**
         * Get the defer prefix for creating the namespaced defers
         */
        getDeferPrefix: function() {
            if (this.defer_prefix == "" && typeof this.getServiceKey == "function") {
                this.setDeferPrefix(this.getServiceKey(), true);
            }
            return this.defer_prefix;
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
        /**
         * Get url parameters used in search query, it just returns the value form the
         * getParams object that is updated on every route
         */
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
        /**
         * _remove is a reserved functionality for every service and should not
         * be overrided or there can be errors in removal of the service
         */
        _remove: function() {
            /**
             * Lets return a defer on call of the remove function as we know
             * we may have some async task to complete on removal of a service
             */
            var def = deferManager.new();

            $.when(this.beforeRemove.call(this)).then(_.bind(function() {

                var defer = false;

                /**
                 * Check if removeSubView exists.
                 * if so then apply the removeSubView Function
                 * now the removeSubView function can be a defer so get the defer value
                 */
                if (typeof this.removeSubView == "function") {
                    defer = this.removeSubView.apply(this, arguments);
                }

                var remove = function() {
                    var dummyDef = false;
                    if (this.remove && typeof this.remove == "function") {
                        dummyDef = this.remove.apply(this, arguments);
                    }
                    return dummyDef;
                };

                var destroy = function() {
                    /**
                     * Terminate all the defer that are associated to the service
                     * Thus use the _remove function very carefully
                     * If there are any defers that have abort functionality then
                     * abort them
                     */
                    deferManager.terminateAll(this.getServiceKey());

                    /**
                     * Stop listening to everything
                     */
                    this.stopListening();
                };

                /**
                 * call the remove function if already exists for the
                 * service, then call the destory function to unbind the listening
                 * events and then resolve the remove deferred
                 */
                $.when(defer)
                    .then(_.bind(remove, this))
                    .then(_.bind(destroy, this))
                    .then(function() {
                        def.resolve();
                    });

            }, this));

            return def;
        },
        beforeRemove: function() {},
    });

    // Add extend to Base Service
    BaseService.extend = extend;

    /**
     * Service Manager
     * Router & Controller are decorated with the service class
     * Service class maintains singleton pattern and thus only one
     * instance of service class can be initiated
     * @todo: Add more comments on what has been done!
     */
    var ServiceManager = function(dm) {
        // dm is defer manager instance

        // Stack of services
        var serviceStack = [];
        var serviceClosureStack = [];

        // check if the service already exists
        var hasService = _.bind(function(serviceKey) {
            var service = _.findWhere(serviceStack, {
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
            var service = _.findWhere(serviceStack, {
                id: serviceKey
            });
            if (service && service.instance) {
                return service;
            }
            return false;
        }, this);

        /**
         * This method adds the service to the serviceStack
         * Accepts service key as input and service class wrapped with service
         * interface to create an instance and add it to serviceStack
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
                instance: serviceInstance,
                type: serviceInstance.getServiceType()
            };
            serviceStack.push(serviceObj);
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
             * If the serviceStack has no such service than load it on demand
             * also as the service is loaded it needs to be a service closure
             * to function properly
             */
            if (!hasService(serviceKey)) {
                /**
                 * load the file that has the service
                 */
                var cb = function(closure) {
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
                    if (!closure || (!closure.isServiceClosure && !closure.isFactory)) {
                        throw "Invalid service/factory: " + serviceKey;
                    }
                    var cls = closure.call(closure, serviceKey, module, closure.type); 
                    if (closure.isServiceClosure) {
                        context = context || closure;
                        def.resolveWith(closure, [getService(serviceKey).instance]);
                    } else if(closure.isFactory){
                        cls = closure.call(closure, serviceKey, module, closure.type);
                        cls.isFactory = true;
                        def.resolveWith(cls, [cls]);
                    }
                };
                var serviceClosureObj = _.findWhere(serviceClosureStack, {
                    id: serviceKey
                });
                if (serviceClosureObj) {
                    cb.call(this, serviceClosureObj.instance);
                } else {
                    require([serviceKey], function(serviceClosure) {
                        cb.call(this, serviceClosure);
                        serviceClosureStack.push({
                            id: serviceKey,
                            instance: serviceClosure
                        });
                    });
                }
            } else {
                var serviceObj = getService(serviceKey);
                context = context || serviceObj.instance;
                def.resolveWith(context, [serviceObj.instance]);
            }
            return def.promise();
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
            var queueLoaded = 0;
            var queue = dm.new();

            // Arguments to resolve the service loader
            var argsMapper = {};
            var args = [];
            context = context || window;

            /**
             * Need to update this with a $.when and $.then
             * to moke it more readable rather than using notify
             */
            queue.progress(function(serviceKey, serviceInstance) {
                argsMapper[serviceKey] = serviceInstance;
                queueLoaded++;
                if (queueLoaded === serviceArray.length) {
                    _.each(serviceArray, function(sk) {
                        args.push(argsMapper[sk]);
                    }, this);
                    def.resolveWith(context, args);
                    queue.terminate();
                }
            });
            _.each(serviceArray, function(serviceKey) {
                serviceLoader(serviceKey, context).done(function(serviceInstance) {
                    serviceInstance.callCount = serviceInstance.callCount ? serviceInstance.callCount + 1 : 1;
                    queue.notify(serviceKey, serviceInstance);
                });
            });
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
            } else if (typeof classDef == "function") {
                if (!classDef.extend) {
                    classDef.extend = extend;
                }
                // Create a clone rather than working with original copy
                classDef = classDef.extend(props, staticProps);
            }
            if (typeof classDef !== "function") {
                throw "Invalid Class Provided for making a service";
            }

            if (typeof classDef._remove != "undefined" || typeof classDef.prototype._remove !== "undefined") {
                throw "Reserved method \"remove\" declared, please use beforeRemove Instead";
            }
            var sm = this;
            var serviceClosure = function(serviceKey, moduleName, serviceType) {
                if (!serviceType) {
                    serviceType = "service";
                    var stArr = serviceKey.match("/.*/(.*)/.*");
                    if (stArr && stArr.length >= 2) {
                        serviceType = (stArr[1] + "").trim();
                    }
                }
                if(serviceType == "layout") {
                    stArr = _.reject(serviceKey.split("/"), function(s){ return _.isEmpty(s.trim());});
                    if (stArr && stArr.length >= 2) {
                        moduleName = (stArr[1] + "").trim();
                    }
                }
                var serviceClass = classDef;
                var serviceKey = serviceKey || _.uniqueId(moduleName + "_");
                if (classDef.isService != true) {
                    _.extend(classDef.prototype, BaseService.prototype);
                    serviceClass = classDef.extend(props, staticProps);
                    serviceClass.isService = true;
                    serviceClass = serviceClass.extend({
                        getModuleName: function() {
                            return moduleName;
                        },
                        getServiceType: function() {
                            return serviceType;
                        },
                        getServiceKey: function() {
                            return serviceKey;
                        }
                    });
                }
                if(!serviceClosure.isFactory) {
                    addService(serviceKey, serviceClass);
                }
                return serviceClass;
            };
            serviceClosure.factory = function() {
                serviceClosure.isFactory = true;
                serviceClosure.isServiceClosure = false;
                return serviceClosure; 
            };
            serviceClosure.isServiceClosure = true;
            return serviceClosure;
        };
        this.removeByKey = function(serviceKey) {
            var service = _.findWhere(serviceStack, {
                id: serviceKey
            });
            if (service) {
                service._remove();
                serviceStack = _.reject(serviceStack, function(s) {
                    return s.id == serviceKey;
                });
                delete service;
                return 1;
            }
            return 0;
        };
        this.removeByType = function(type, serviceKey) {
            var services = _.filter(serviceStack, function(s) {
                return (s.type == type && s.id !== serviceKey);
            });
            if (typeof services == "undefined") {
                services = [];
            }
            var totalService = services.length;
            if (services.length) {
                _.each(services, function(s) {
                    s.instance._remove();
                    serviceStack = _.reject(serviceStack, function(stackService) {
                        return s.id == stackService.id;
                    });
                    delete s;
                });
            }
            return totalService;
        }
        this.removeByTypeExcept = this.removeByType;
        this.getStack = function() {
            return serviceStack;
        };
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
        //console.log(url, root, fragment);

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
        layout: function(layout, callback) {
            layout = layout ? layout : "default";
            this._layoutRet = this.deferred();
            var serviceDef = this.loadService("layouts/" + layout + "/index");
            serviceDef.done(_.bind(function(layoutInstance) {
                this.listenTo(layout, "success", function() {
                    this._layoutRet.resolveWith(this, layoutInstance);
                    this._layoutRet.terminate();
                }, this);
                setTimeout(_.bind(function(){
                    this._layoutRet.resolve();
                },this),3000);
            }, this));
            this._layoutRet;
            return this._layoutRet;
        },
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
            var router = this;

            var execObj = _.isObject(name) ? name : (_.isObject(callback) ? callback : {});
            if (!_.isEmpty(execObj) && _.isString(execObj["controller"]) && _.isString(execObj["action"])) {
                execObj["module"] = execObj["module"] || this.getModuleName();
                execObj["layout"] = typeof execObj["layout"] !== "undefined" ? execObj["layout"]: false;
                var serviceKey = "modules/" + execObj["module"] + "/controllers/" + execObj["controller"];
                callback = function() {
                    var args = Array.prototype.slice.call(arguments);
                    // Discard the query string
                    args.pop();
                    // Remove the controllers but not the one that is being called. 
                    // This helps in good execition when moving from route withing same controller
                    serviceManager.removeByTypeExcept("controller", serviceKey);
                    serviceManager.loadService(serviceKey).done(function(controller) {
                        if (controller.isFactory) {
                            controller = new controller;
                        }
                        controller.setRouteParam(args);
                        if (typeof controller[execObj["action"]] != "undefined") {

                            /**
                             * Resolve the initialization and the layout then execute the
                             * required action
                             */
                            var layoutDef = false;
                            if(execObj["layout"]) {
                                layoutDef = router.layout(execObj["layout"]);
                            }
                            $.when(controller._initRet)
                                .then(function(){return layoutDef;})
                                .then(_.bind(controller[execObj["action"]], controller));
                        }
                    });
                };
            }

            if (!callback) callback = this[name];
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
     * View Ovverrides as we need to add support for subviews and removal of subviews as
     * soon as the view is removed
     * Subviews can be added on the fly and if it existed already it can be made the subview
     * forcefully
     */
    var view = Backbone.View.extend({
        subViews: [],
        getSubView: function(names) {
            // If name is not provided return all views
            if (_.isEmpty(names)) {
                return _.pluck(this.subViews, 'instance');
            }
            if (_.isString(names)) {
                names = [names];
            }
            var views = [];
            _.each(names, function(name) {
                var view = _.findWhere(this.subViews, {
                    id: name
                });
                if (view) {
                    views.push(view);
                }
            }, this);
            return _.pluck(views, 'instance');
        },
        setSubView: function(name, instance) {
            var existingViews = this.getSubView(name);
            if (existingViews && existingViews.length) {
                throw "Subview with name :" + name + ", already exists.";
            }
            if (_.isEmpty(name)) {
                throw "Invalid name to set subview";
            }
            if (!instance || instance.getServiceType() !== "view") {
                throw "Invalid subview instance provided! Must be an instance of z.view";
            }
            var subViewObj = {
                id: name,
                instance: instance
            };
            this.subViews.push(subViewObj);
            return this;
        },
        removeSubView: function(names) {
            var views = this.getSubView(names);

            var queueLoaded = 0;
            var queue = deferManager.new();
            queue.progress(function() {
                queueLoaded++;
                if (queueLoaded === views.length) {
                    queue.resolveWith(context, args);
                }
            });
            _.each(views, function(view) {
                $.when(view._remove.call(view)).then(function() {
                    queue.notify("done");
                });
            });
            return queue;
        }
    });

    /**
     * Custom controllers for handling the layout, views & deferreds with
     * base url are necessary for namespacing all urls
     *
     * @type {*|void|extend}
     */
    var controller = function() {
        this._initRet = this.initialize.apply(this, arguments);
        if (
            this._initRet && 
            _.isFunction(this._initRet.promise) &&
            _.isFunction(this._initRet.resolve)
        ) {
            this._initRet = this._initRet.promise();
        }
    };
    _.extend(controller.prototype, Events, {
        _initRet: false,
        _layoutRet: false,
        initialize: function() {},
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
            if (_.isString(setter)) {
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
                rs.type = "router";
                return rs;
            };

            /**
             * Return a registerable instance of controller
             */
            this.controller = function(props, staticProps) {
                var cs = serviceManager.convertToService(controller, props, staticProps);
                cs.type = "controller";
                return cs;
            }

            /**
             * Returns a registerable instnace of view
             */
            this.view = function(props, staticProps) {
                var v = serviceManager.convertToService(view, props, staticProps);
                v.type = "view";
                return v;
            };
            /**
             * Returns a registerable instance of layout
             */
            this.layout = function(props, staticProps) {
                var l = serviceManager.convertToService(view, props, staticProps);
                l.type = "layout";
                return l;
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
            }, null, {
                terminateDeferreds: true
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