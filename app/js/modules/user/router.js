define(["zeb"], function(z){
	var router = z.router({
		routes: {
			'user': 'homePage'
		},
		homePage: function(){
			alert("At user home page");
		},
		initialize: function() {
		}
	});
	return router;
});