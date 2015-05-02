window.onload = (function () {
	
	var model = {
		locations: null, //Array of location objects pulled from server
		
		markers: Object.create(null), //Maps location object ids to map markers, rebuilt on each page reload,
		
		api: Object.create(null), //Maps location object ids to api responses
					
		init:function(callback,scope){
			controller.makeRequest({pathname:"locations"}, function(error, result){
				if (error){
					controller.reportError(error);
				}else{
					model.locations = JSON.parse(result);
					model.api.yelp = Object.create(null);
					model.api.wikipedia = Object.create(null);
					model.locations.forEach(function(location){
						controller.makeAPIRequest("yelp", {term: location.name, 
												location: location.address.street+ ", " +
														  location.address.city+ ", "  + 
														  location.address.state + " " +
														  location.address.zipcode},
												function(error,result){
													if(error){
														controller.reportError(error);
													}else{
														model.api.yelp[location.id] = JSON.parse(result);
													}
												});
					});
					
					model.locations.forEach(function(location){
						controller.makeAPIRequest("wikipedia", {titles: location.name},
												function(error,result){
													if(error){
														controller.reportError(error);
													}else{
														model.api.wikipedia[location.id] = JSON.parse(result);
													}
												});
					});
					callback.call(scope);
				}
			});
		}
	};
	
	var controller = {
		getLocations: function(){
			return model.locations
		},
		
		getLocation: function(index){
			return this.getLocations()[index];
		},
		
		getMarkers: function(){
			return model.markers;
		},
		
		getMarker: function(locationid){
			return model.markers[locationid];
		},
		
		setMarker: function(locationid, marker){
			model.markers[locationid] = marker;
		},
		
		getYelpData: function(locationid){
			return model.api.yelp[locationid];
		},
		
		getWikipediaExtract: function(locationid){
			return model.api.wikipedia[locationid];
		},
		
		makeRequest: function(options, callback){
			//Create a new ajax request
			var req = new XMLHttpRequest();
			
			//Set request header
			req.open(options.method || "GET", options.pathname, true);
			
			//Async, so add event listener for when a response is recieved
			req.addEventListener("load", function(){
				if (req.status < 400)
					callback(null, req.responseText);
				else
					callback(new Error("Request Failed: "+ req.statusText));
			});
			
			//Event listener for other, server-related errors
			req.addEventListener("error", function(){
				callback(new Error("Network Error"));
			});
			
			//Send the request
			req.send(options.body || null);
		},
		
		makeAPIRequest: function(api,queryParams,callback){
			var pathname = "api/" + api + "?";
			for (var param in queryParams){
				pathname += encodeURI(param) + "=" + encodeURI(queryParams[param]) + "&";
			}
			pathname = pathname.slice(0,-1);
			this.makeRequest({pathname: pathname}, callback);
		},
		
		reportError: function(error){
			//Alerts user to a request error 
			if(error)
				alert(error.toString());
		},
		
		search: function(query){
			//Get all locations
			var locations = controller.getLocations();
			
			//If there is no query, send back all locations
			if (query ==  ""){
				return locations;
			}else{
				//Create RegExp object (case-insensitive) with the query
				var regexp = new RegExp(query, 'i');
				
				//Filter matching locations
				var list = locations.filter(function(location){
					for(var property in location){
					
						//Check if a location property maps to an object (address)
						if (typeof location[property] == "object"){
						
							for (var subproperty in location[property]){
							
								//if the property value is a string and matches the query, return true
								if (typeof location[property][subproperty] == "string" && location[property][subproperty].match(regexp))
									return true;
							}
						}else{
						
							//If the property value is a string and it matches the query, return true
							if (typeof location[property] == "string" && location[property].match(regexp))
								return true;
							}
					}
				});
				
				//Return list of matching locations
				return list;
			}
		},
		
		init: function(){
			model.init(view.init, view);
			
		}
	};
	
	var view = {
		init: function(){
		
			var locations = controller.getLocations();
			
			//Initialize DOM Hooks
			this.main = document.querySelector("main");
			this.sidebar = document.querySelector("#sidebar");
			
			//Initialize Map
			this.initMap(locations);
			
			//Initialize Sidebar
			this.initSidebar(locations);
			
			//Initialize Location Panel
			this.initLocationPanel(locations);

		},
		
		initMap: function(locations){
			//Initialize Map
			this.mapElement = document.createElement("div")
			this.mapElement.id = "map-canvas";
			this.mapElement.style.display="inline-block";
			this.mapCanvas = new google.maps.Map(this.mapElement, {center: new google.maps.LatLng(42.3601983,-71.127229),zoom:14});
			
			//Add Map to DOM
			this.main.appendChild(this.mapElement);
			
			//Initialize Info Window
			this.infoWindow = new google.maps.InfoWindow({content:""}); //shared among markers
			
			//Add Markers to Map
			locations.forEach(function(location, index){
				var marker = new google.maps.Marker({position: location.marker.position, title:location.marker.title});
				marker.index = index;
				google.maps.event.addListener(marker, "click", function(){view.renderInfoWindow(marker,location);});
				marker.setMap(view.mapCanvas);
				controller.setMarker(location.id, marker);
			});
		},
		
		initSearchBar: function(){
			//Initialize Search Bar
			this.searchBar = document.createElement("div");
			this.searchBar.id = "search-bar";
			
			//Add label
			var label = document.createElement("label");
			label.textContent = "Search: ";
			this.searchBar.appendChild(label);
			
			//Wire up a search field and add to search bar
			var searchField = document.createElement("input");
			searchField.addEventListener("change", function(){
				var results = controller.search(searchField.value);
				view.renderMap(results);
				view.renderSidebar(results);
			});
			this.searchBar.appendChild(searchField);
		},
		
		initSidebar: function(locations){
			//Init Search Bar and add to Sidebar
			this.initSearchBar();
			this.sidebar.appendChild(this.searchBar);
			
			//Set title for sidebar
			var h2 = document.createElement("h2");
			h2.textContent = "Locations";
			h2.className = "sidebar-title";
			this.sidebar.appendChild(h2);
			
			//Create unordered list for locations
			var ul = document.createElement("ul");
			
			//Create list item for each location
			locations.forEach(function(location, index){
			
				//Create container for location
				var div = document.createElement("div");
				div.className = "sidebar-entry";
				
				//make location marker bounce when clicked
				div.addEventListener("click", function(){
					var marker = controller.getMarker(location.id);
					marker.setAnimation(google.maps.Animation.BOUNCE);
					setTimeout(function(){
						marker.setAnimation(null);
					}, 2000);
					view.renderInfoWindow(marker,location);
				});
				
				//Location title
				var h3 = document.createElement("h3");
				h3.textContent = location.name;
				h3.className = "sidebar-entry-name";
				div.appendChild(h3);
				
				//Location address
				var address = document.createElement("p");
				address.className = "sidebar-entry-address";
				address.textContent = location.address.street + ", " + location.address.city + ", " + location.address.state + " " + location.address.zipcode;
				div.appendChild(address);
					
				//Location description
				var description = document.createElement("p");
				description.className = "sidebar-entry-description";
				description.textContent = location.description;
				div.appendChild(description);
				
				//Create and append list item
				var li = document.createElement("li");
				if (index % 2 == 0)
					li.className = " highlighted";
				li.appendChild(div);
				ul.appendChild(li);
			});
			
			this.sidebar.appendChild(ul);
		},
		
		initLocationPanel: function(locations){
			//Initialize Location Panel
			this.locationPanel = document.createElement("div");
			this.locationPanel.id = "location-panel";
			
			//Add exit button to Location Panel
			var exitButton = document.createElement("button");
			exitButton.textContent = "close";
			exitButton.id = "exit-button";
			exitButton.addEventListener("click", function(){
				view.main.children[0].removeChild(view.locationPanel); //overlay instead of replace, for optimization
				view.infoWindow.close();
			});
			this.locationPanel.appendChild(exitButton);
			
			//Clearing div for exit button
			var clear = document.createElement("div");
			clear.id = "clear";
			this.locationPanel.appendChild(clear);
			
			//Wrapper for contents of Location Panel
			var locationPanelWrapper = document.createElement("div");
			locationPanelWrapper.id = "location-panel-wrapper";
			
			//Wrapper for header elements
			var wrapperHeader = document.createElement("div");
			wrapperHeader.id = "location-panel-header"
			
			//Add title to header
			var title = document.createElement("h1");
			title.id = "location-panel-title";
			wrapperHeader.appendChild(title);
			
			//Append header to Location Panel Wrapper
			locationPanelWrapper.appendChild(wrapperHeader);
			
			//Wrapper for body elements
			var wrapperBody = document.createElement("div");
			wrapperBody.id = "location-panel-body";
			
			//Add image to body
			var image = document.createElement("img");
			image.id = "location-panel-image";
			image.src = "";
			wrapperBody.appendChild(image);
			
			//Wrapper for basic info
			var wrapperBasic = document.createElement("div");
			wrapperBasic.id = "location-panel-body-basic";
			
			//Add title to basic
			var basicTitle = document.createElement("h3");
			basicTitle.id = "location-panel-title-basic";
			basicTitle.textContent = "Basic Information:";
			wrapperBasic.appendChild(basicTitle);
			
			//Add address to basic 
			var address = document.createElement("p");
			address.id = "location-panel-address";
			wrapperBasic.appendChild(address);
			
			//Add description to basic
			var description = document.createElement("p");
			description.id = "location-panel-description";
			wrapperBasic.appendChild(description);
			
			//Append basic wrapper to body wrapper
			wrapperBody.appendChild(wrapperBasic);
			
			//Wrapper for expanded 
			var wrapperExpanded = document.createElement("div");
			wrapperExpanded.id = "location-panel-body-expanded";
			
			//Add title to expanded
			var expandedTitle = document.createElement("h3");
			expandedTitle.id = "location-panel-title-expanded";
			expandedTitle.textContent = "Expanded Information:";
			wrapperExpanded.appendChild(expandedTitle);
			
			//Add yelp information box
			var yelpDiv = document.createElement("div");
			yelpDiv.id = "location-panel-yelp-expanded";
			
			//Add yelp review information
			var yelpStats = document.createElement("span");
			yelpStats.id = "location-panel-yelp-stats";
			
			var yelpStars = document.createElement("img");
			yelpStars.id = "location-panel-yelp-stars";
			yelpStars.src = "";
			
			var yelpReviewCount = document.createElement("span");
			yelpReviewCount.id = "location-panel-yelp-reviews";
			
			yelpStats.appendChild(yelpStars);
			yelpStats.appendChild(document.createTextNode(" based on "));
			yelpStats.appendChild(yelpReviewCount);
			yelpStats.appendChild(document.createTextNode(" reviews. Read them at "));
				
			//Add yelp attribution
			var yelpLink = document.createElement("a");
			yelpLink.id = "location-panel-yelp-link";
			yelpLink.href = "";
			
			var yelpLogo = document.createElement("img");
			yelpLogo.id = "location-panel-yelp-logo";
			yelpLogo.src = "../img/attributions/yelp_medium.png";
			
			yelpLink.appendChild(yelpLogo);
			
			//Add yelp info box to expanded wrapper
			yelpDiv.appendChild(yelpStats);
			yelpDiv.appendChild(yelpLink);
			wrapperExpanded.appendChild(yelpDiv);
			
			//Add wikipedia box
			var wikipediaDiv = document.createElement("div");
			wikipediaDiv.id = "location-panel-wikipedia-expanded";
			wrapperExpanded.appendChild(wikipediaDiv);
			
			//Append expanded wrapper to body wrapper
			wrapperBody.appendChild(wrapperExpanded);
			
			//Clear body
			var clearBody = document.createElement("div");
			clearBody.id = "clear";
			wrapperBody.appendChild(clearBody);
			
			//Append body to Location Panel Wrapper
			locationPanelWrapper.appendChild(wrapperBody);
			
			this.locationPanel.appendChild(locationPanelWrapper);
			
		},
		
		renderMap: function(locations){
			//Remove all map markers
			var markers = controller.getMarkers();
			for (var id in markers){
				markers[id].setMap(null);
			}
			
			//Add back markers for given locations
			locations.forEach(function(location){
				markers[location.id].setMap(view.mapCanvas)
			});
			
		},
		
		renderSidebar: function(locations) {
			//Remove Existing ul
			this.sidebar.removeChild(this.sidebar.querySelector("ul"));
			
			//Create unordered list for locations
			var ul = document.createElement("ul");
			
			//Create list item for each location
			locations.forEach(function(location, index){
			
				//Create container for location
				var div = document.createElement("div");
				div.className = "sidebar-entry";
				
				//make location marker bounce when clicked
				div.addEventListener("click", function(){
					var marker = controller.getMarker(location.id);
					marker.setAnimation(google.maps.Animation.BOUNCE);
					setTimeout(function(){
						marker.setAnimation(null);
					}, 2000);
					view.renderInfoWindow(marker,location);
				});
				
				//Location title
				var h3 = document.createElement("h3");
				h3.textContent = location.name;
				h3.className = "sidebar-entry-name";
				div.appendChild(h3);
				
				//Location address
				var address = document.createElement("p");
				address.className = "sidebar-entry-address";
				address.textContent = location.address.street + ", " + location.address.city + ", " + location.address.state + " " + location.address.zipcode;
				div.appendChild(address);
					
				//Location description
				var description = document.createElement("p");
				description.className = "sidebar-entry-description";
				description.textContent = location.description;
				div.appendChild(description);
				
				//Create and append list item
				var li = document.createElement("li");
				if (index % 2 == 0)
					li.className = " highlighted";
				li.appendChild(div);
				ul.appendChild(li);
			});
			
			this.sidebar.appendChild(ul);
		},
		
		renderLocationPanel: function(location){
			//Get dynamic components
			var yelpData = controller.getYelpData(location.id);
			var wikipediaExtract = controller.getWikipediaExtract(location.id);
			
			var yelpDiv = this.locationPanel.querySelector("#location-panel-yelp-expanded");
			var yelpStars = yelpDiv.querySelector("#location-panel-yelp-stars"); //image
			var yelpReviewCount = yelpDiv.querySelector("#location-panel-yelp-reviews");
			var yelpLink = yelpDiv.querySelector("#location-panel-yelp-link");
			var wikipediaDiv = this.locationPanel.querySelector("#location-panel-wikipedia-expanded");
			
						
			//Fill in basic fields
			var image = this.locationPanel.querySelector("#location-panel-image"); //Add image if it exists
			if (yelpData.hasOwnProperty("image")){
				image.src = yelpData.image;
				image.style.display = "block";
			}else{
				image.style.display = "none";
			}
			var title = this.locationPanel.querySelector("#location-panel-title");
			title.textContent = location.name;
			
			var address = this.locationPanel.querySelector("#location-panel-address");
			address.textContent = "Address: " + location.address.street + ", " + location.address.city + ", " + location.address.state + " " + location.address.zipcode;
	
			var description = this.locationPanel.querySelector("#location-panel-description");
			description.textContent = "Description: " + location.description;
			
			//Fill in expanded fields
			if (!(yelpData.hasOwnProperty("rating") && yelpData.hasOwnProperty("reviewCount")) && !wikipediaExtract.extract){
				this.locationPanel.querySelector("#location-panel-body-expanded").style.display = "none";
			}else{
				this.locationPanel.querySelector("#location-panel-body-expanded").style.display = "block";
			}
			
			if (yelpData.hasOwnProperty("rating") && yelpData.hasOwnProperty("reviewCount")){
				yelpStars.src = yelpData.rating;
				yelpReviewCount.textContent = yelpData.reviewCount;
				yelpLink.href = yelpData.url;
				yelpDiv.style.display = "block";
			}else{
				yelpDiv.style.display = "none";
			}
			
			if (wikipediaExtract.hasOwnProperty("extract") && wikipediaExtract.extract){
				wikipediaDiv.textContent = wikipediaExtract.extract + " source: Wikipedia.";
				wikipediaDiv.style.display = "block";
			}else{
				wikipediaDiv.style.display = "none";
			}
			
			this.main.children[0].appendChild(this.locationPanel); 
		},
		
		renderInfoWindow(marker,location){
			var div = document.createElement("div");
			var title = document.createElement("h4");
			title.textContent = location.name;
			var description = document.createElement("p");
			description.textContent = location.description;
			var button = document.createElement("button");
			button.textContent = "Extended View";
			button.addEventListener("click", function(){
				view.renderLocationPanel(location);
				view.infoWindow.close();
			});
			div.appendChild(title);
			div.appendChild(description);
			div.appendChild(button);
			this.infoWindow.setContent(div);
			this.infoWindow.open(this.mapCanvas,marker);
			
		}
	};

	document.onload = controller.init();
})();