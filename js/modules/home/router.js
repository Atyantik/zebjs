define([], function(){
	var router = Z.makeRouter({
		baseUrl: 'tex',
		routes: {
			'/': 'homePage'
		},
		homePage: function(){
			alert("At home page");
		},
		initialize: function() {
		}
	});
	return router;
});