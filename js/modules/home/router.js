define([], function(){
	var router = Z.makeRouter({
		routes: {
			'': 'homePage'
		},
		homePage: function(){
			alert("At home page");
		},
		initialize: function() {
		}
	});
	return router;
});