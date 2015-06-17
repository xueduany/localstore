/**
 * @module localstore
 */
define('localstore/localstore', [ 'localstore/connector', 'localstore/config' ], function(connector, CONFIG) {
	var localstoreConnectors, initId, jobQueue = [], readyState = 0, debugFlag = false, localStore = {
	    save : save,
	    read : read,
	    del : del,
	    clear : clear,
	    enableDebug : function() {
		    debugFlag = true;
	    },
	    disableDebug : function() {
		    debugFlag = false;
	    }
	};
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
		localstoreConnectors.storeMap = {};
		try {
			if (localStorage.getItem('_localstoreConnectors_storeMap_')) {
				localstoreConnectors.storeMap = JSON.parse(localStorage.getItem('_localstoreConnectors_storeMap_'));
			}
		} catch (e) {
			error(e);
		}
		jobQueue = [];
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
							// success
							if (localstoreConnectors.cmdMap[id]) {
								var cmd = localstoreConnectors.cmdMap[id];
								var needRefreshStoreMap = false;
								if (data.cmd == 'set') {
									localstoreConnectors.storeMap[cmd.message.key] = {
									    location : findConnectorLocation(e.source),
									    lastModifyTime : Date.now()
									}
									needRefreshStoreMap = true;
								} else if (data.cmd == 'remove') {
									delete localstoreConnectors.storeMap[cmd.message.key];
									needRefreshStoreMap = true;
								} else if (data.cmd == 'clear') {
									for ( var k in localstoreConnectors.storeMap) {
										var p = localstoreConnectors.storeMap[k];
										if (p.location == data.location) {
											delete localstoreConnectors.storeMap[k];
										}
									}
									needRefreshStoreMap = true;
								}
								if (cmd.then && typeof (cmd.then) == 'function') {
									cmd.then.call(this, data.data);
								}
								delete localstoreConnectors.cmdMap[id];
								needRefreshStoreMap && localStorage.setItem('_localstoreConnectors_storeMap_', JSON.stringify(localstoreConnectors.storeMap));
								//
								for (var i = 0; i < localstoreConnectors.length; i++) {
									localstoreConnectors[i].status = 1;
								}
							}
						} else {
							// fault
							tryAgain(data);
						}
					}
				}
			}
		});
		localstoreConnectors.cmdMap = {};
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
				break;
			}
		}
		for (var i = 0, j = localstoreConnectors.length; i < j; i++) {
			if (localstoreConnectors[i].status != 1) {
				break;
			} else if (i == j - 1) {
				// put default index 0
				localstoreConnectors.currentStore = localstoreConnectors.currentStore || localstoreConnectors[0];
				readyState = 1;
				doJob();
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
		// deal with error
		localstoreConnectors.currentStore.status = 0;
		localstoreConnectors.currentStore = lookForFree();
		if (localstoreConnectors.currentStore) {
			localstoreConnectors.currentStore.connector.postMessage(localstoreConnectors.cmdMap[message.id].message, '*')
		} else {
			error('Can`t save cache!');
		}
	}
	/**
	 * write cache
	 */
	function save(key, value, then) {
		if (readyState) {
			var uniqueId = generateUniqueId();
			var message = {
			    cmd : 'set',
			    id : uniqueId,
			    key : key,
			    value : value
			};
			localstoreConnectors.cmdMap[uniqueId] = {
			    then : then,
			    message : message
			};
			try {
				var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
				(locateStore(existedLocation)).connector.postMessage(message, '*')
			} catch (e) {
				error(e);
			}
		} else {
			jobQueue.push([ 'save', key, value, then ])
		}
	}
	/**
	 * get cache
	 */
	function read(key, then) {
		if (readyState) {
			var uniqueId = generateUniqueId();
			var message = {
			    cmd : 'get',
			    id : uniqueId,
			    key : key
			};
			localstoreConnectors.cmdMap[uniqueId] = {
			    then : then,
			    message : message
			};

			var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
			if (existedLocation) {
				(locateStore(existedLocation)).connector.postMessage(message, '*')
			} else {
				if (typeof (then) == 'function') {
					then.call(this, null);
				}
			}
		} else {
			jobQueue.push([ 'read', key, then ])
		}
	}
	/**
	 * remove
	 */
	function del(key, then) {
		if (readyState) {
			var uniqueId = generateUniqueId();
			var message = {
			    cmd : 'remove',
			    id : uniqueId,
			    key : key
			};
			localstoreConnectors.cmdMap[uniqueId] = {
			    then : then,
			    message : message
			};
			var existedLocation = localstoreConnectors.storeMap[key] ? localstoreConnectors.storeMap[key].location : null;
			if (existedLocation) {
				var obj = locateStore(existedLocation);
				obj.connector.postMessage(message, '*');
			}
		} else {
			jobQueue.push([ 'del', key, then ])
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
	/**
	 * do Job
	 */
	function doJob() {
		while (detail = jobQueue.shift()) {
			localStore[detail[0]].apply(localStore, detail.slice(1))
		}
	}
	function error(e) {
		if (debugFlag) {
			alert(e);
			console && console.log(e.stack);
			console && console.log(e);
		}
	}
	function clear(url, then) {
		if (readyState) {
			if (url == null) {
				var total = localstoreConnectors.length;
				function allEndThen() {
					localStorage.setItem('_localstoreConnectors_storeMap_', '{}');
					url && url();
				}
				for (var i = 0; i < localstoreConnectors.length; i++) {
					var uniqueId = generateUniqueId();
					var message = {
					    cmd : 'clear',
					    id : uniqueId
					};
					localstoreConnectors.cmdMap[uniqueId] = {
					    then : function() {
						    total--;
						    if (total == 0) {
							    allEndThen();
						    }
					    },
					    message : message
					};
					localstoreConnectors[i].connector.postMessage(message, '*');
				}
			} else if (typeof (url) == 'function') {
				var total = localstoreConnectors.length;
				function allEndThen() {
					localStorage.setItem('_localstoreConnectors_storeMap_', '{}');
					url && url();
				}
				for (var i = 0; i < localstoreConnectors.length; i++) {
					var uniqueId = generateUniqueId();
					var message = {
					    cmd : 'clear',
					    id : uniqueId
					};
					localstoreConnectors.cmdMap[uniqueId] = {
					    then : function() {
						    total--;
						    if (total == 0) {
							    allEndThen();
						    }
					    },
					    message : message
					};
					localstoreConnectors[i].connector.postMessage(message, '*');
				}
			} else if (typeof (url) == 'number') {
				var uniqueId = generateUniqueId();
				var message = {
				    cmd : 'clear',
				    id : uniqueId
				};
				localstoreConnectors.cmdMap[uniqueId] = {
				    then : then,
				    message : message
				};
				localstoreConnectors[url].connector.postMessage(message, '*');
			} else if (url.length) {
				for (var i = 0; i < localstoreConnectors.length; i++) {
					if (localstoreConnectors[i].location == url) {
						var obj = locateStore(url);
						var uniqueId = generateUniqueId();
						var message = {
						    cmd : 'clear',
						    id : uniqueId
						};
						localstoreConnectors.cmdMap[uniqueId] = {
						    then : then,
						    message : message
						};
						obj.connector.postMessage(message, '*');
						break;
					}
				}
			}
		} else {
			jobQueue.push([ 'clear', url, then ])
		}
	}
	return localStore;
})