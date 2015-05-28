define(["zeb"], function(z) {
	var controller = z.controller({
        index: function() {
            alert("You are in HOME controller already.. What to do now. ::Module - " + this.getModuleName());
        }
    });
    return controller;
});