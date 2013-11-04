/**
 * @module localstore
 */
define('localstore/localstore', [ 'localstore/connector', 'localstore/config' ], function(connector, CONFIG) {
	var localstoreConnectors, initId;
	initilize();
	//
	/**
	 * initilize
	 */
	function initilize() {
		localstoreConnectors = [];
		initId = 0;
		CONFIG.AVAILABLE_SUBDOMAIN_LIST.forEach(function(subDomainUrl) {
			localstoreConnectors.push({
				status : 0,
				location : subDomainUrl,
				connector : new connector(subDomainUrl)
			});
		})
		localstoreConnectors.currentStore = null;
		/*
		 * regist message event handle
		 */
		self.addEventListener('message', function(e) {
			var data = e.data;
			if ('result' in data) {
				switch (data.cmd) {
				case 'status':
					if (data.result == 1) {
						connectorReady(e.source);
					}
					break;
				default:
					if ('id' in data) {
						var id = data.id;
						if (data.result) {
							//success
							if (localstoreConnectors.cmdMap[id] && localstoreConnectors.cmdMap[id].then && typeof (localstoreConnectors.cmdMap[id].then) == 'function') {
								var cmd = localstoreConnectors.cmdMap[id];
								var needRefreshStoreMap = false;
								if (data.cmd == 'set') {
									localstoreConnectors.storeMap[cmd.key] = {
										location : findConnectorLocation(e.source),
										lastModifyTime : Date.now()
									}
									needRefreshStoreMap = true;
								} else if (data.cmd == 'remove') {
									delete localstoreConnectors.storeMap[cmd.key];
									needRefreshStoreMap = true;
								}
								cmd.then.call(this, data.data);
								delete localstoreConnectors.cmdMap[id];
								needRefreshStoreMap && localStorage.setItem('_localstoreConnectors_storeMap_', JSON.stringify(localstoreConnectors.storeMap));
							}
						} else {
							//fault
							tryAgain(data);
						}
					}
				}
			}
		});
		localstoreConnectors.cmdMap = {};
		localstoreConnectors.storeMap = {};
	}
	/**
	 * generate a unique cmd id
	 */
	function generateUniqueId() {
		return [ Date.now(), (initId++) ].join('');
	}
	/**
	 * tell currentWindow , proxy html is ready
	 */
	function connectorReady(win) {
		for (var i = 0; i < localstoreConnectors.length; i++) {
			if (localstoreConnectors[i].connector == win) {
				localstoreConnectors[i].status = 1;
				localstoreConnectors.currentStore = localstoreConnectors.currentStore || localstoreConnectors[i];
				break;
			}
		}
	}
	function findConnectorLocation(win) {
		for (var i = 0; i < localstoreConnectors.length; i++) {
			if (localstoreConnectors[i].connector == win) {
				return localstoreConnectors[i].location;
			}
		}
	}
	/**
	 * catch error and fix it
	 */
	function tryAgain(message) {
		//deal with error
		localstoreConnectors.currentStore.status = 0;
		localstoreConnectors.currentStore = lookForFree();
		if (localstoreConnectors.currentStore) {
			localstoreConnectors.currentStore.connector.postMessage(localstoreConnectors.cmdMap[message.id], '*')
		} else {
			throw new Exception('Can`t save cache!');
		}
	}
	/**
	 * write cache
	 */
	function save(key, value, then) {
		var uniqueId = generateUniqueId();
		localstoreConnectors.cmdMap[uniqueId] = {
			key : key,
			value : value,
			then : then
		};
		try {
			var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
			(locateStore(existedLocation)).connector.postMessage({
				cmd : 'set',
				id : uniqueId,
				key : key,
				value : value
			}, '*')
		} catch (e) {
			//
		}
	}
	/**
	 * get cache
	 */
	function read(key, then) {
		var uniqueId = generateUniqueId();
		localstoreConnectors.cmdMap[uniqueId] = {
			key : key,
			then : then
		};
		var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
		if (existedLocation) {
			(locateStore(existedLocation)).connector.postMessage({
				cmd : 'get',
				id : uniqueId,
				key : key
			}, '*')
		} else {
			if (typeof (then) == 'function') {
				then.call(this, null);
			}
		}
	}
	/**
	 * remove
	 */
	function del(key, then) {
		var uniqueId = generateUniqueId();
		localstoreConnectors.cmdMap[uniqueId] = {
			key : key,
			then : then
		};
		var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
		if (existedLocation) {
			(locateStore(existedLocation)).connector.postMessage({
				cmd : 'remove',
				id : uniqueId,
				key : key
			}, '*')
		}
	}
	/**
	 * find subdomain iframe for store
	 */
	function locateStore(subDomainUrl) {
		if (subDomainUrl == null || subDomainUrl == localstoreConnectors.currentStore.location) {
			return localstoreConnectors.currentStore;
		} else {
			for (var i = 0; i < localstoreConnectors.length; i++) {
				if (localstoreConnectors[i].location == subDomainUrl) {
					return localstoreConnectors[i];
				}
			}
		}
		return null;
	}
	/**
	 * look for free store can save
	 */
	function lookForFree() {
		for (var i = 0; i < localstoreConnectors.length; i++) {
			if (localstoreConnectors[i].status == 1) {
				return localstoreConnectors[i];
			}
		}
		return null;
	}
	return {
		save : save,
		read : read,
		del : del
	}
})