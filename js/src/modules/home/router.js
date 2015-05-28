define(["zeb"], function(z){
	var router = z.router({
		baseUrl: "",
		routes: {
			'': {
				controller: 'home',
				action: 'index'
			},
			'dashboard': {
				controller: "dashboard",
				action: "index"
			}
		},
		initialize: function() {			
		},
		homePage: function(){
		}
	});
	return router;
});