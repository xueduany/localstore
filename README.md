Pure Javascript Local Ultimate UnLimited Spaces, Base on HTML5
==============================================================

Installation
------------
Wait for some day

Usage
-----

For example,
```js
	require([ 'localstore/localstore' ], function(localstore) {
			setTimeout(function() {
				localstore.save('asdasdasd', '91823091823091823', function() {
					alert('save ok');
					localstore.read('asdasdasd', function(cache) {
						alert('you saved item is ' + cache);
					});
				});

			}, 1000)

		})
```

First, you need a subDomain list for store context,
like 
- statics1.gtimg.com
- statics2.gtimg.com
- statics3.gtimg.com
- statics4.gtimg.com
- ...and so on

中文说明
--------
纯Js实现本地无限空间存储，例子见test-save.html

首先配置你的静态资源域名如

----------------------------------------------
你可以看一些很屌很屌的例子，见
http://xueduany.github.com/localstore/