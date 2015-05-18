define(["zeb"], function(z){
	var router = z.router({
		baseUrl: "home",
		routes: {
			'test': 'homePage'
		},
		homePage: function(){
			alert("At Product home page");
		},
		initialize: function() {
		}
	});
	return router;
});