define("js/modules/home/controllers/dashboard",["zeb"],function(e){var o=e.controller({initialize:function(){},index:function(){alert("Am calling index")}});return o.factory()}),define("js/modules/home/controllers/home",["zeb"],function(e){var o=e.controller({index:function(){alert("You are in HOME controller already.. What to do now. ::Module - "+this.getModuleName());var e=this.deferred();e.done(_.bind(function(){this.redirect("dashboard")},this)),setTimeout(function(){e.resolve()},3e3)}});return o});