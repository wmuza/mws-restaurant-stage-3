if (typeof idb === "undefined") {
        self.importScripts('js/idb.js');
    }
 
const staticCacheName = 'restaurant-static-14';

const dbPromise = idb.open('mws-restaurant-database', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants');
  }
});

// IndexedDB object with get & set methods 
// https://github.com/jakearchibald/idb
const idbKeyVal = {
  get(key) {
    return dbPromise.then(db => {
      return db
        .transaction('restaurants')
        .objectStore('restaurants')
        .get(key);
    });
  },
  set(key, val) {
    return dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      tx.objectStore('restaurants').put(val, key);
      return tx.complete;
    });
  }
};

// list of assets to cache on install
// cache each restaurant detail page as well
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
          '/img/offline.png'
          
        ]).catch(error => {
          console.log('Caches open failed: ' + error);
        });
      })
  );
});

// intercept all requests
// either return cached asset or fetch from network
self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // Filter Ajax Requests
  if (requestUrl.port === '1337') {
    event.respondWith(idbResponse(request));
  }
  else {
    event.respondWith(cacheResponse(request));
  }
});

function idbResponse(request) {
  // Check idb and return match but if no match then clone, save and return response
  return idbKeyVal.get('restaurants')
    .then(restaurants => {
      return (
        restaurants ||
        fetch(request)
          .then(response => response.json())
          .then(json => {
            idbKeyVal.set('restaurants', json);
            return json;
          })
      );
    })
    .then(response => new Response(JSON.stringify(response)))
    .catch(error => {
      return new Response(error, {
        status: 404,
        statusText: 'A bad request has been made check idbResponse'
      });
    });
}

function cacheResponse(request) {
  // Check matched response but if no match then fetch, open cache, cache.put response.clone, return response
  return caches.match(request).then(response => {
    return response || fetch(request).then(fetchResponse => {
      return caches.open(staticCacheName).then(cache => {
        return fetchResponse;
      });
    });
  }).catch(error => {
    if (request.url.includes('.jpg')) {
      return caches.match('/img/offline.png');
    }
    // On error return: You are Not connected to the internet
    return new Response(error, {
      status: 404,
      statusText: 'You are Not connected to the internet  check cacheResponse'
    });
  });
}

// delete old/unused static caches
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