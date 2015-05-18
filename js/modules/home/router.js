define(["zeb"], function(z){
	var router = z.router({
		routes: {
			'': {
				controller: 'home',
				action: 'index'
			}
		},
		homePage: function(){
		},
		initialize: function() {
		}
	});
	return router;
});