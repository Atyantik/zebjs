define(["zeb"], function(z) {
	var controller = z.controller({
        index: function() {
            alert("You are in HOME controller already.. What to do now. ::Module - " + this.getModuleName());
            var def = this.deferred();
            def.done(_.bind(function() {
            	this.redirect("dashboard");
            }, this));
            
            setTimeout(function(){
            	def.resolve();
            },3000);
        }
    });
    return controller;
});