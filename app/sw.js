if (typeof idb === "undefined") {
        self.importScripts('js/idb.js');
    }
 
const staticCacheName = 'restaurant-static-14';

const dbPromise = idb.open('udacity-restaurant-db', 3, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', { keyPath: 'id', unique: true });
    case 1:
      const reviewStore = upgradeDB.createObjectStore('reviews', { autoIncrement: true });
      reviewStore.createIndex('restaurant_id', 'restaurant_id');
    case 2:
      upgradeDB.createObjectStore('offline', { autoIncrement: true });
  }
});
self.dbPromise = dbPromise;

// IndexedDB object with get & set methods 
// https://github.com/jakearchibald/idb
const idbKeyVal = {
  get(store, key) {
    return dbPromise.then(db => {
      return db
        .transaction(store)
        .objectStore(store)
        .get(key);
    });
  },
  getAll(store) {
    return dbPromise.then(db => {
      return db
        .transaction(store)
        .objectStore(store)
        .getAll();
    });
  },
  getAllIdx(store, idx, key) {
    return dbPromise.then(db => {
      return db
        .transaction(store)
        .objectStore(store)
        .index(idx)
        .getAll(key);
    });
  },
  set(store, val) {
    return dbPromise.then(db => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(val);
      return tx.complete;
    });
  },
  setReturnId(store, val) {
    return dbPromise.then(db => {
      const tx = db.transaction(store, 'readwrite');
      const pk = tx
        .objectStore(store)
        .put(val);
      tx.complete;
      return pk;
    });
  },
  delete(store, key) {
    return dbPromise.then(db => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      return tx.complete;
    });
  },
  openCursor(store) {
    return dbPromise.then(db => {
      return db.transaction(store, 'readwrite')
        .objectStore(store)
        .openCursor();
    });
  }
};
self.idbKeyVal = idbKeyVal;

// list of assets to cache on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName)
      .then(cache => {
        return cache.addAll([
          '/index.html',
          '/css/styles.css',
          '/js/dbhelper.js',
          '/js/register_sw.js',
          '/js/main.js',
          '/js/restaurant_info.js',
          '/restaurant.html?id=1',
          '/restaurant.html?id=2',
          '/restaurant.html?id=3',
          '/restaurant.html?id=4',
          '/restaurant.html?id=5',
          '/restaurant.html?id=6',
          '/restaurant.html?id=7',
          '/restaurant.html?id=8',
          '/restaurant.html?id=9',
          '/restaurant.html?id=10',
          '/img/offline.png',
		  '/img/icons/fav.png',
		  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
		  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png'
          
        ]).catch(error => {
          console.log('Caches open failed: ' + error);
        });
      })
  );
});


// intercept all requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  
  // Filter Ajax Requests
  if (requestUrl.port === '1337') {
    if (event.request.method !== 'GET') {
      console.log('filtering out non-GET method');
      return;
    }
    
    if (request.url.includes('reviews')) {
      let id = +requestUrl.searchParams.get('restaurant_id');
      event.respondWith(idbReviewResponse(request, id));
    } else {
      event.respondWith(idbRestaurantResponse(request));
    }
  }
  else {
    event.respondWith(cacheResponse(request));
  }
});


function idbRestaurantResponse(request, id) {
  return idbKeyVal.getAll('restaurants')
    .then(restaurants => {
      if (restaurants.length) {
        return restaurants;
      }
      return fetch(request)
        .then(response => response.json())
        .then(json => {
          json.forEach(restaurant => {
            idbKeyVal.set('restaurants', restaurant);
          });
          return json;
        });
    })
    .then(response => new Response(JSON.stringify(response)))
    .catch(error => {
      return new Response(error, {
        status: 404,
        statusText: 'my bad request'
      });
    });
}



function idbReviewResponse(request, id) {
  return idbKeyVal.getAllIdx('reviews', 'restaurant_id', id)
    .then(reviews => {
      if (reviews.length) {
        return reviews;
      }
      return fetch(request)
        .then(response => response.json())
        .then(json => {
          json.forEach(review => {
            idbKeyVal.set('reviews', review);
          });
          return json;
        });
    })
    .then(response => new Response(JSON.stringify(response)))
    .catch(error => {
      return new Response(error, {
        status: 404,
        statusText: 'my bad request'
      });
    });
}


function cacheResponse(request) {
  return caches.match(request)
  .then(response => {
    return response || fetch(request).then(fetchResponse => {
      return caches.open(staticCacheName).then(cache => {
        return fetchResponse;
      });
    });
  }).catch(error => {
    if (request.url.includes('.jpg')) {
      return caches.match('/img/offline.png');
    }
    return new Response(error, {
      status: 404,
      statusText: 'You are Not connected to the internet  check cacheResponse'
    });
  });
}


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('restaurant-static-') && cacheName !== staticCacheName;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

const wait = function (ms) {
  return new Promise(function (resolve, reject) {
    window.setTimeout(function () {
      resolve(ms);
      reject(ms);
    }, ms);
  });
};
self.wait = wait;


const favoriteClickHandler = (evt, fav, restaurant) => {
  evt.preventDefault();
  const is_favorite = JSON.parse(restaurant.is_favorite); // set to boolean

  DBHelper.toggleFavorite(restaurant, (error, restaurant) => {
    if (error) {
      showOffline();
    } else {
      DBHelper.updateIDBRestaurant(restaurant); 
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
self.favoriteClickHandler = favoriteClickHandler;

