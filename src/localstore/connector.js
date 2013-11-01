define('localstore/connector', function() {
	return function(url) {
		var connectorIframe = document.createElement('iframe');
		connectorIframe.style.display = 'none';
		connectorIframe.src = url;
		document.body.appendChild(connectorIframe);
		return connectorIframe.contentWindow;
	}
})