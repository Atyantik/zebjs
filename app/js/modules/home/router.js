define(["zeb"], function(z){
	var router = z.router({
		baseUrl: "",
		routes: {
			'': {
				model: 'home',
				controller: 'home',
				action: 'index',
				layout: 'default'
			},
			'dashboard': {
				controller: "dashboard",
				action: "index",
				layout: 'default'
			}
		},
		initialize: function() {
		},
		homePage: function(){
		}
	});
	return router;
});