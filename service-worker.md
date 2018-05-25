# 前言
最近翻了一下红宝书，看到 Web Worker 这一章，忽然发现，以 Web Worker 为桥梁，居然能把下面几个缓存相关的概念串联起来，甚为有趣，撰文记之。

1. 浏览器缓存
2. 应用缓存（application cache）
3. WebWorker
4. CacheStorage
4. Service Worker

# 浏览器缓存
传统意义上的浏览器缓存，我称它为 Header 缓存，因为无论是强缓存还是协商缓存，这两者的实现方式都是通过设置 HTTP Header。这两者的异同已经被讨论得很多了，我就不赘述了。
附一个参考文档：http://coderlt.coding.me/2016/11/21/web-cache/
http://www.cnblogs.com/wonyun/p/5524617.html

Header 缓存有两个缺点：

1. 即便你把网站的所有静态资源都做了强缓存，当没有网络的时候，也照样无法访问，因为你的 HTML 总得去服务器取。
2. header 缓存不可编程，无法通过 JS 来精确控制缓存的增删改查。

# 应用缓存
为了解决无网络也能访问的问题，HTML5 规范中设计了应用缓存 application cache 这个 API。
应用缓存是什么，以及怎么用，请参考官方文档：https://developer.mozilla.org/zh-CN/docs/Web/HTML/Using_the_application_cache
然而要说明的是，这种技术由于有太多的缺陷，已经被废弃。http://harttle.land/2017/04/09/service-worker-now.html
PS：想当年本科毕设的时候还用到了这种技术，没想到这么快就被废弃了，技术的迭代真的是日新月异啊。

# CacheStorage
为了能够精准地，可编程地控制缓存，CacheStorage 被设计出来。具体怎么用，请看文档：https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
这里要强调的是：并非只有在 Service Worker 中才能使用 CacheStorage ，在普通的 JS 进程中你也能使用 CacheStorage，比如你可以直接在控制台访问到 caches 变量。
可编程的问题解决了，然而，要实现离线访问，只有 CacheStorage 还不够。

# WebWorker
一直以来，每个浏览器的一个网页，主要有两个线程：GUI 渲染线程 和 JS 引起线程。无论你的 JS 写的多么精妙，也无法逃脱这样的一个限制：所有的 JS 都在一个 JS 引擎线程中执行，
而 JS 引擎线程与 GUI 渲染线程是互斥的，也就是说：当 JS 执行的时候，UI 界面会被阻塞。为了运行耗时长的 JS，又不想阻塞 UI，可以使用 WebWorker 新建一个 JS 线程，把高耗时的 JS
放在 webworker 线程中执行。具体的请参考官方文档：https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers 或者阮一峰的教程：http://javascript.ruanyifeng.com/htmlapi/webworker.html
然而，这个 webworker 是专门为新建它的页面服务的，也就是说，不同页面可以有不同的 webworker，但是不同页面不能共同拥有同一个 webworker。
而且当页面关闭时，webworker 也会随之结束，并不会常驻浏览器中。

# Service Worker
终于到了本文的主角登场了。
Service Worker 与 web worker 相比，

相同点是：它们都是新建了一个 JS 线程。

不同点包括：
1. Service worker 不是服务于某个特定页面的，而是服务于多个页面的。（按照同源策略）
2. Service worker 会常驻浏览器中，即便网页关闭，service worker 线程也不会停止。除非你主动终止它或者浏览器回收它。
3. 生命周期、可调用的 API、事件等等都有很大的区别。


关于如何使用 Service worker，请参看这些参考资料，我就不赘述了。
1. 官方文档：https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API/Using_Service_Workers
2. 借助Service Worker和cacheStorage缓存及离线开发：http://www.zhangxinxu.com/wordpress/2017/07/service-worker-cachestorage-offline-develop/
3. 使用Service Worker做一个PWA离线网页应用：https://fed.renren.com/2017/10/04/service-worker/
4. 【译】理解Service Worker：https://zhuanlan.zhihu.com/p/28461857

下面以我写的 Demo 为例，探讨几个问题。
下面谈几个比较容易被忽略的地方，请确保对 sw 有了基本认识之后再往下看 。

## sw 只是 sw
sw 只是一个在浏览器中常驻的 JS 线程，它本身做不了什么。它能做什么，全看跟哪些 API 进行搭配。
跟 fetch 搭配，可以从浏览器层面拦截请求，做数据 mock 等；
跟 fetch 和 cacheStorage 搭配，可以做离线应用；
跟 push 和 notification 搭配，可以做想 native app 那样的消息推送。https://www.villainhr.com/page/2017/01/08/Web%20%E6%8E%A8%E9%80%81%E6%8A%80%E6%9C%AF
把这些技术融合在一起，再加上 manifest 等其他的技术，便成了 pwa。
总之，sw 是非常关键的一种新 API，它在浏览器中开启了一个常驻的线程，在它上面我们可以做很多的事情。

## 初次访问不会触发 fetch
首次访问页面，激活 sw，注册 fetch 事件。然而，各种资源的请求并不会触发 fetch 事件，只有当下一次访问页面的时候，才会触发 fetch 事件。为什么呢？
→ 这是官方特意设计的。理由是为了保证一致性，如果你的 html 页面加载时是没有 sw 的，那么由此引发的请求也不会被 sw 观察到。
> The first time you load the demo, even though dog.svg is requested long after the service worker activates, it doesn't handle the request, and you still see the image of the dog. The default is consistency, if your page loads without a service worker, neither will its subresources. If you load the demo a second time (in other words, refresh the page), it'll be controlled. Both the page and the image will go through fetch events, and you'll see a cat instead.
出处：https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#activate

## Cache.add VS Cache.put
当用户首次访问页面的时候，sw 安装之后，调用 cache.addAll ，会对数组里面的 resources 重新发起请求，然后将拿到的资源缓存下来，而 cache.put 不会发起新的请求。
也就是：cache.add = fetch + cache.put
> The add() method of the Cache interface takes a URL, retrieves it, and adds the resulting response object to the given cache. The add() method is functionally equivalent to the following:
```js
fetch(url).then(function(response) {
  if (!response.ok) {
    throw new TypeError('bad response status');
  }
  return cache.put(url, response);
})
```
出处：https://developer.mozilla.org/en-US/docs/Web/API/Cache/add

## event.waitUntil 和 event.resondWith
我们在很多例子中都有看到这两个东西，但是鲜有对他们进行解释的。对此我也只是理解了一点点。

先说 event.waitUntil
1. 只能在 sw 的 install 和 activate 中使用；
2. 作用相当于一个 callback，当传入参数 promise resoleved 的时候，再继续执行下面的操作。比如，当 install 中 cache.addAll 里面所有资源都获取成功了，sw 才算安装成功，才能继续往下激活。
否则整个 sw 会被废弃。

文档：https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil

再说 event.respondWith
1. 只能在 sw 的 fetch 事件中使用
2. 作用相当于一个 callback，当传入参数 promise resolved 的时候，才会将 response 返回给浏览器。

文档：https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith

总而言之，虽然 event.waitUntil 和 event.resondWith 中的 event 都是继承自 Event 对象，然而它们是只能在 sw 中用的 API，与常见的 event 对象无关。

## 资源更新
资源更新分三类：

1. html 更新
2. js，image 等静态资源更新
3. sw 本身的更新

1. 不要把 sw.js 本身也缓存，这样当有资源更新的时候，我们就可以通过更改 sw.js 来告知浏览器需要更新。
2. 无论是哪一种资源的更新，都必须更改 sw 本身，所以 sw 里面要有一个 version 的概念。注：上面参考资料使用了更改 sw.js 文件名来触发更新，这样子就必须搭配额外的方式来判定 html
是否有改动。官方并不推荐这种做法，具体请参考这里。
3. 当浏览器检测到 sw.js 放生改变时（字节对比），会触发新 sw 的 install 事件，然后对 addAll 里面的资源重新获取一遍，存放到新的 cache 空间中。（注意，这里的 allAll，不管你的资源是否有更新，
都会重新获取，这是个问题，下面会继续谈到）
3. 为了避免在多个页面中引发缓存的冲突，新版本的 sw ，需要开辟新的 cache 命名空间。等到老版本 sw 控制的 client 都释放，新版本 sw 开始激活之时，再把老版本的 cache 空间删除掉。


## 双重缓存
上面我们谈到，当新的 sw.js 安装的时候，会重新获取 allAll 里面的所有资源，不管是否有更新，这显然与我们违背了增量下载原则，怎么办呢？ → 结合浏览器缓存和sw，构造双重缓存。sw 在前，强缓存在后。
这样子当新的 sw install 的时候，那些没有改变的静态资源，就会直接从强缓存中获取，不会再发多余的请求，perfect！具体的demo 可以参考我写的例子。

# 总结
写的这儿，也差不多该结束了。虽然 sw 用作缓存，在兼容性方面还有待提高，但是，这肯定是未来的方向。



