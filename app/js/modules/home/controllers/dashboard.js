define(["zeb"], function(z) {
	var controller = z.controller({
        initialize: function(){
        },
        index: function() {
            alert("Am calling index");
            //alert("You are in DASHBOARD controller already.. What to do now. ::Module - " + this.getModuleName());
        }
    });
    console.log(controller.factory());
    return controller.factory();
});