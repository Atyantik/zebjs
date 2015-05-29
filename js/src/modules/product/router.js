define(["zeb"], function(z){
	var router = z.router({
		routes: {
			'product': {
				controller: "product",
				action: "list"
			}
		},
		homePage: function(){
			alert("At Product home page");
		},
		initialize: function() {
		}
	});
	return router;
});