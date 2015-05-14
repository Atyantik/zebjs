define([], function(){
	var router = Z.makeRouter({
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