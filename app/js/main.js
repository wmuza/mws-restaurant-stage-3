let restaurants,
  neighborhoods,
  cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Load Process Queue from DBHelper Class
 */
window.addEventListener('load', function () {
  DBHelper.processQueue();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoid211emEiLCJhIjoiY2prazBkaW1vMWd2eDNxbXA5aGZmNnk0OSJ9.Qc4cnYCX6lHJCIoSoZ3pyQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const picture = document.createElement('picture');
  const source0 = document.createElement('source');
  const source1 = document.createElement('source');
  const source2 = document.createElement('source');
  const image = document.createElement('img');  
  const altText = restaurant.name + ' restaurant in ' + restaurant.neighborhood;
  
  picture.className = 'restaurant-picture';
  image.className = 'restaurant-img';  
  image.title = altText;
  image.alt = altText;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  
  source0.srcset = DBHelper.srcset_medium_jpg(restaurant);
  source0.media  = "(min-width: 750px)";
  source0.type   = "image/jpeg";
  
  source1.srcset = DBHelper.srcset_medium_jpg(restaurant);
  source1.media  = "(min-width: 500px)";
  source1.type = "image/jpeg";
  
  source2.srcset = DBHelper.srcset_small_jpg(restaurant);
  source2.type = "image/jpeg";

  li.append(picture);    
  picture.append(source0);
  picture.append(source1);
  picture.append(source2);
  picture.append(image); 

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);
 
  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('button');
  more.innerHTML = 'View Details';
  more.addEventListener('click', () => { window.location.href = DBHelper.urlForRestaurant(restaurant); });
  li.append(more);

  const fav = document.createElement('button');
  fav.className = 'fav-control';
  fav.setAttribute('aria-label', 'favorite');
  
  if ((/true/i).test(restaurant.is_favorite)) {
    fav.classList.add('active');
    fav.setAttribute('aria-pressed', 'true');
    fav.innerHTML = `Remove ${restaurant.name} as a favorite`;
    fav.title = `Remove ${restaurant.name} as a favorite`;
  } else {
    fav.setAttribute('aria-pressed', 'false');
    fav.innerHTML = `Add ${restaurant.name} as a favorite`;
    fav.title = `Add ${restaurant.name} as a favorite`;
  }

  fav.addEventListener('click', (evt) => {
    favoriteClickHandler(evt, fav, restaurant);
  }, false);
  
  li.append(fav);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
}; 

const showOffline = () => {
  document.querySelector('#offline').setAttribute('aria-hidden', false);
  document.querySelector('#offline').setAttribute('aria-live', 'assertive');
  document.querySelector('#offline').classList.add('show');
    
  wait(8000).then(() => {
    document.querySelector('#offline').setAttribute('aria-hidden', true);
    document.querySelector('#offline').setAttribute('aria-live', 'off');
    document.querySelector('#offline').classList.remove('show');
  });
};

const favoriteClickHandler = (evt, fav, restaurant) => {
  evt.preventDefault();
  const is_favorite = JSON.parse(restaurant.is_favorite); // set to boolean

  DBHelper.toggleFavorite(restaurant, (error, restaurant) => {
    console.log('got callback');
    if (error) {
      console.log('We are offline. Review has been saved to the queue.');
      showOffline();
    } else {
      console.log('Received updated record from DB Server', restaurant);
      DBHelper.updateIDBRestaurant(restaurant); // write record to local IDB store
    }
  });

  // set ARIA, text, & labels
  if (is_favorite) {
    fav.setAttribute('aria-pressed', 'false');
    fav.innerHTML = `Add ${restaurant.name} as a favorite`;
    fav.title = `Add ${restaurant.name} as a favorite`;
  } else {
    fav.setAttribute('aria-pressed', 'true');
    fav.innerHTML = `Remove ${restaurant.name} as a favorite`;
    fav.title = `Remove ${restaurant.name} as a favorite`;
  }
  fav.classList.toggle('active');
};