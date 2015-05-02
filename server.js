//SET UP
var http = require("http");
var fs = require("fs");
var Router = require("./router");
var ecstatic = require("ecstatic");

var router = new Router();
var fileServer = ecstatic({root:"./public"});

var yelp = require("yelp").createClient({
	consumer_key: "consumer_key",
	consumer_secret: "consumer_secret",
	token:"token",
	token_secret: "token_secret"
});



//CREATE SERVER
http.createServer(function(req,res){
	if (!router.resolve(req,res))
		fileServer(req,res);
}).listen(8000);



//LOAD LOCATION DATA FROM FILE SYSTEM
function loadLocationData(locations){
	fs.readFile("./locations.json", function(error, result){
		if(error){
			throw error;
		}else{
			var data = JSON.parse(result);
			for (var property in data){
				if (data.hasOwnProperty(property))
					locations[property] = data[property];
			}
		}
	});
}

var locations = Object.create(null);
loadLocationData(locations);


//SET UP ROUTER METHODS
router.add("GET", /^\/locations$/, function(request,response){
	var list = [];
	for (var property in locations){
		list.push(locations[property]);
	}
	response.writeHead("200", {"Content-Type": "application/json"});
	response.end(JSON.stringify(list));
});

router.add("GET", /^\/locations\/(\d+)$/, function(request,response,id){
	if (id in locations){
		response.writeHead("200", {"Content-Type": "application/json"});
		response.end(JSON.stringify(locations[id]));
	}else{
		response.writeHead("404", {"Content-Type": "text/plain"});
		response.end("404: Not Found");
	}
});

router.add("GET", /^\/api\/yelp$/, function(request,response){
	//Extract query from request url
	var query = require("url").parse(request.url,true).query;
	//Make query to yelp api 
	yelp.search({term: query.term, location: query.location, limit:1}, function(error, data) {
		if (error){
			//If error, let the client know
			response.writeHead("500", {"Content-Type": "text/plain"});
			response.end("Error: "+error.toString());
		} else{
			//Else, build a result object with only the data needed by client
			var result = Object.create(null)
			if (data.businesses.length > 0 && typeof data.businesses[0] == "object"){
				var business = data.businesses[0];
				
				if (business.hasOwnProperty("image_url"))
					result.image = business.image_url;
					
				if (business.hasOwnProperty("rating_img_url"))
					result.rating = business.rating_img_url;
					
				if (business.hasOwnProperty("review_count"))
					result.reviewCount = business.review_count;
				
				if (business.hasOwnProperty("display_phone"))
					result.phone = business.display_phone;
					
				if (business.hasOwnProperty("url"))
					result.url = business.url;
			}
			response.writeHead("200", {"Content-Type": "application/json"});
			response.end(JSON.stringify(result));
		}	
	});
});

router.add("GET", /^\/api\/wikipedia$/, function(request,response){
	var query = require("url").parse(request.url,true).query;
	query.titles = query.titles.replace(/\w+[\w']*/g,function(match){
			return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
	});
	
	var address = 'http://en.wikipedia.org' + 
				  '/w/api.php?format=json&action=query' + 
				  '&prop=extracts&exintro=&explaintext=&titles=' +
				   encodeURIComponent(query.titles) + "&redirects";
				   
	http.get(address, function(res){
		var result ="";
		
		res.on("data", function(chunk){
			result += chunk.toString();
		});
		
		res.on("error", function(error){
			response.writeHead("500", {"Content-Type": "text/plain"});
			response.end(error.toString());
		});
		
		res.on("end", function(){
			result = JSON.parse(result);
			var sendback = Object.create(null);
			var pages = result.query.pages || {};
			
			for (var property in pages){
				if(pages[property].hasOwnProperty("extract") && pages[property].extract != "")
					sendback.extract = pages[property].extract;
				else
					sendback.extract = null;
			}
			response.writeHead("200", {"Content-Type": "application/json"});
			response.end(JSON.stringify(sendback));
		});
		
	}).on("error", function(error){
		console.log(error);
	});
	
});




