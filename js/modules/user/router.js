define([], function(){
	var router = Z.makeRouter({
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