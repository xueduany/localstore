self.onmessage = function(message) {
	try {
		var sign = message.data;
		var returnMessage = {};
		switch (sign.cmd) {
		case 'set':
			try {
				localStorage.setItem(sign.key, sign.value);
				returnMessage = {
				    cmd : sign.cmd,
				    result : 1,
				    id : sign.id,
				    location : location.href
				}
			} catch (e) {
				returnMessage = {
				    cmd : sign.cmd,
				    result : 0,
				    data : JSON.stringify(e),
				    id : sign.id,
				    location : location.href
				}
			}
			break;
		case 'get':
			try {
				var cacheItem = localStorage.getItem(sign.key);
				returnMessage = {
				    cmd : sign.cmd,
				    result : 1,
				    data : cacheItem,
				    id : sign.id,
				    location : location.href
				}
			} catch (e) {
				//
			}
			break;
		case 'remove':
			try {
				localStorage.removeItem(sign.key);
				returnMessage = {
				    cmd : sign.cmd,
				    result : 1,
				    id : sign.id,
				    location : location.href
				}
			} catch (e) {
				//
			}
			break;
		case 'clear':
			try {
				localStorage.clear();
				returnMessage = {
				    cmd : sign.cmd,
				    result : 1,
				    id : sign.id,
				    location : location.href
				}
			} catch (e) {
				//
			}
		default:
			break;
		}
		parent.postMessage(returnMessage, '*');
	} catch (e) {
		console.log(e.stack);
		console.log(e);
		console.log('current args:');
		console.log(message);
	}
}
parent.postMessage({
    cmd : 'status',
    result : 1
}, '*');