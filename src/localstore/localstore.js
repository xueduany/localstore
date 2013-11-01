/**
 * @module localstore
 */
define('localstore/localstore', [ 'localstore/connector', 'localstore/config' ], function(connector, CONFIG) {
	var _localstore_connectors_, initId;
	initilize();
	//
	/**
	 * initilize
	 */
	function initilize() {
		_localstore_connectors_ = [];
		initId = 0;
		CONFIG.AVAILABLE_SUBDOMAIN_LIST.forEach(function(subDomainUrl) {
			_localstore_connectors_.push({
				status : 0,
				location : subDomainUrl,
				connector : new connector(subDomainUrl)
			});
		})
		_localstore_connectors_.currentStore = null;
		self.addEventListener('message', function(e) {
			var data = e.data;
			switch (data.cmd) {
			case 'status':
				if (data.result == 1) {
					connectorReady(e.source);
				}
				break;
			case 'result':
				if ('id' in data) {
					var id = data.id;
					if (data.result) {
						if (_localstore_connectors_.cmdMap[id] && _localstore_connectors_.cmdMap[id].then && typeof (_localstore_connectors_.cmdMap[id].then) == 'function') {
							_localstore_connectors_.cmdMap[id].then.call(this, data.data);
							delete _localstore_connectors_.cmdMap[id];
						}
					} else {
						faultTolerant(data);
					}
				}
				break;
			}
		});
		_localstore_connectors_.cmdMap = {};
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
		for (var i = 0; i < _localstore_connectors_.length; i++) {
			if (_localstore_connectors_[i].connector == win) {
				_localstore_connectors_[i].status = 1;
				_localstore_connectors_.currentStore = _localstore_connectors_.currentStore || _localstore_connectors_[i];
				break;
			}
		}
	}
	/**
	 * catch error and fix it
	 */
	function faultTolerant(message) {
		//deal with error
		_localstore_connectors_.currentStore.status = 0;
		_localstore_connectors_.currentStore = lookForFree();
		if (_localstore_connectors_.currentStore) {
			_localstore_connectors_.currentStore.connector.postMessage(_localstore_connectors_.cmdMap[message.id], '*')
		} else {
			throw new Exception('Can`t save cache!');
		}
	}
	/**
	 * write cache
	 */
	function save(key, value, then) {
		var uniqueId = generateUniqueId();
		_localstore_connectors_.cmdMap[uniqueId] = {
			key : key,
			value : value,
			then : then
		};
		try {
			var existedLocation = localStorage.setItem(key, _localstore_connectors_.currentStore.location);
			if (existedLocation != _localstore_connectors_.currentStore.location) {
				_localstore_connectors_.currentStore.connector.postMessage({
					cmd : 'remove',
					id : uniqueId,
					key : key
				}, '*')
				localStorage.setItem(key, _localstore_connectors_.currentStore.location);
			}
			_localstore_connectors_.currentStore.connector.postMessage({
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
	function get(key, then) {
		var uniqueId = generateUniqueId();
		_localstore_connectors_.cmdMap[uniqueId] = {
			key : key,
			then : then
		};
		var existedLocation = localStorage.getItem(key);
		if (existedLocation) {
			var foundStore = locateStore(existedLocation);
			if (foundStore) {
				foundStore.connector.postMessage({
					cmd : 'get',
					id : uniqueId,
					key : key
				}, '*')
			}
		} else {
			if (typeof (then) == 'function') {
				then.call(this, null);
			}
		}
	}
	/**
	 * remove
	 */
	function remove(key, then) {
		var uniqueId = generateUniqueId();
		_localstore_connectors_.cmdMap[uniqueId] = {
			key : key,
			then : then
		};
		var existedLocation = localStorage.getItem(key);
		if (existedLocation) {
			localStorage.removeItem(key);
			var foundStore = locateStore(existedLocation);
			if (foundStore) {
				foundStore.connector.postMessage({
					cmd : 'remove',
					id : uniqueId,
					key : key
				}, '*')
			}
		}
	}
	/**
	 * find subdomain iframe for store
	 */
	function locateStore(subDomainUrl) {
		for (var i = 0; i < _localstore_connectors_.length; i++) {
			if (_localstore_connectors_[i].location == subDomainUrl) {
				return _localstore_connectors_[i];
			}
		}
		return null;
	}
	/**
	 * look for free store can save
	 */
	function lookForFree() {
		for (var i = 0; i < _localstore_connectors_.length; i++) {
			if (_localstore_connectors_[i].status == 1) {
				return _localstore_connectors_[i];
			}
		}
		return null;
	}
	return {
		save : save,
		get : get
	}
})