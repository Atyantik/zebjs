define(["zeb"], function(Z){
	var router = Z.router({
		routes: {
			'admin': 'homePage'
		},
		homePage: function(){
			alert("At admin home page");
		},
		initialize: function() {
		}
	});
	return router;
});