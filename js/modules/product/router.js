define([], function(){
	var router = Z.makeRouter({
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