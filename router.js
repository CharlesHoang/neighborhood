var Router = module.exports = function(){
	this.routes = [];
};

Router.prototype.add = function(method, url, callback){
	this.routes.push({method: method, 
					  url: url,
					  handler: callback});
};

Router.prototype.resolve = function(req, res){
	var path = require('url').parse(req.url).pathname;
	
	return this.routes.some(function(route){
		var match = route.url.exec(path);
		if(!match || route.method != req.method)
			return false;
		
		var urlParts = match.slice(1).map(decodeURIComponent);
		route.handler.apply(null,[req,res].concat(urlParts));
		return true;
	});
};