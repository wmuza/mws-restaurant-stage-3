if (typeof idb === "undefined") {
        importScripts('idb.js');
    }

	
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


// Shared code goes here since this file get included on all pages...
// Shared methods below...
const wait = function (ms) {
  return new Promise(function (resolve, reject) {
    window.setTimeout(function () {
      resolve(ms);
      reject(ms);
    }, ms);
  });
};
self.wait = wait;

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
self.showOffline = showOffline;

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
self.favoriteClickHandler = favoriteClickHandler;