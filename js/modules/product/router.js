define([], function(){
	var router = Z.makeRouter({
		routes: {
			'product': 'homePage'
		},
		homePage: function(){
			alert("At Product home page");
		},
		initialize: function() {
		}
	});
	return router;
});