self.onmessage = function(message) {
	var sign = message.data;
	var returnMessage = {};
	switch (sign.cmd) {
	case 'set':
		try {
			localStorage.setItem(sign.key, sign.value);
			returnMessage = {
				cmd : sign.cmd,
				result : 1,
				id : sign.id
			}
		} catch (e) {
			returnMessage = {
				cmd : sign.cmd,
				result : 0,
				data : e,
				id : sign.id
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
				id : sign.id
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
				id : sign.id
			}
		} catch (e) {
			//
		}
		break;
	default:
		break;
	}
	parent.postMessage(returnMessage, '*');
}
parent.postMessage({
	cmd : 'status',
	result : 1
}, '*');