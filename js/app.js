window.onload = (function () {
	
	var model = {
		locations: [{id:0,
					name:"Dunkin' Donuts", 
					address: {street: "209 N Harvard St",
							  city: "Allston",
							  state: "MA",
							  zipcode: 02134},
					description: "Long-running chain serving signature donuts, breakfast sandwiches & a variety of coffee drinks.", 
					type: "Food", 
					marker:{
						position: {lat:42.362553, lng:-71.130689}, 
						title: "Dunkin' Donuts"}
					},
					{id:1,
					name:"Swissbakers Inc", 
					address: {street: "168 Western Ave",
							  city: "Boston",
							  state: "MA", 
							  zipcode: 02134},
					description: "European-style bakery showcasing homemade breads, pretzels & pastries in a bright & airy location.", 
					type: "Food", 
					marker:{
						position: {lat:42.362902, lng:-71.128484}, 
						title: "Swissbakers Inc"}
					},
					{id:2,
					name:"Buried Treasures", 
					address: {street: "377 Cambridge St",
							  city: "Allston",
							  state: "MA", 
							  zipcode: 02134},
					description: "Veteran smoke shop stocking glassware, hookahs & other accessories, plus organic cotton clothing.", 
					type: "Shopping", 
					marker:{
						position: {lat:42.355632, lng:-71.133028}, 
						title: "Buried Treasures"}
					},
					{id:3,
					name:"Harvard Stadium", 
					address: {street: "79 N Harvard St",
							  city: "Allston",
							  state: "MA", 
							  zipcode: 02134},
					description: "University's historic u-shaped football stadium hosts a variety of sports & events.", 
					type: "Attractions", 
					marker:{
						position: {lat:42.366033, lng:-71.127390}, 
						title: "Harvard Stadium"}
					},
					{id:4,
					name:"Bonnie Upholstering & Furniture Co Inc", 
					address: {street: "273 Western Ave",
							  city: "Allston",
							  state: "MA", 
							  zipcode: 02134},
					description: "This store specializes in customized mattresses & cushions made of foam, with many fabric options.", 
					type: "Shopping", 
					marker:{
						position: {lat:42.363559, lng:-71.133483}, 
						title: "Bonnie Upholstering & Furniture Co Inc"}
					}],
		
		markers: Object.create(null), //Maps location object ids to map markers, rebuilt on each page reload,
		
		api: {lastRequest: Date.now(),
			  content: Object.create(null)}, //not sure if I'll keep this...depends on how the server is structured
					
		init:function(){
			var cache = JSON.parse(localStorage.getItem("neighborhood"));
			if (cache)
				this.locations = cache;
			else
				localStorage.setItem("neighborhood", JSON.stringify(this.locations))
		}
	};
	
	var controller = {
		getLocations: function(){
			return JSON.parse(localStorage.getItem("neighborhood"));
		},
		
		setLocations: function(locations){
			localStorage.setItem("neighborhood", JSON.stringify(locations));
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
		
		init: function(){
			model.init();
			view.init();
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
			
			//Initialize Info Window (there is a single info window shared by all markers)
			
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
			
			//Add Title
			var title = document.createElement("h1");
			title.id = "location-panel-title";
			this.locationPanel.appendChild(title);
			
			//Add Address
			var address = document.createElement("p");
			address.id = "location-panel-address";
			this.locationPanel.appendChild(address);
			
			//Add Description
			var description = document.createElement("p");
			description.id = "location-panel-description";
			this.locationPanel.appendChild(description);
			
			
		},
		
		renderLocationPanel: function(location){
			//Fill in fields
			var title = this.locationPanel.querySelector("#location-panel-title");
			title.textContent = location.name;
			
			var address = this.locationPanel.querySelector("#location-panel-address");
			address.textContent = location.address.street + ", " + location.address.city + ", " + location.address.state + " " + location.address.zip;
			
			var description = this.locationPanel.querySelector("#location-panel-description");
			description.textContent = location.description;
			
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