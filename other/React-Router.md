# 前言
2 年前我初次接触 React-Router ,觉得这玩意儿很神奇，只定义几个 Route 和 Link，便可以控制整个 React 应用的路由。
那时候我还停留在会用就行的阶段，也写过一篇与之相关的博文 #12，现在看来，那时候的文章写得还真的是很差劲。😁
今天，我们来认真研究一番，希望能解决以下两个问题。

1. SPA 路由的工作原理是什么？
2. React-Router 是如何跟 React 结合起来的？

# 先说说 hash 的历史
最开始的网页是多页面的，后来出现了 ajax 之后，才慢慢地有了 SPA。然而， SPA 也有它的弊端：

1. 用户使用应用的过程中，url 不会发生任何变化，当用户操作了几步之后，一不小心刷新了页面，就会又回到了最开始的状态。
2. 用户在浏览应用的某部分的时候，希望收藏起来下次再访问，但是由于缺乏路由控制，用户无法做到这样精确地收藏，只能再从头开始。

怎么办呢？→ 使用 [hash（url上的 # 号）](http://www.ruanyifeng.com/blog/2011/03/url_hash.html) 来 hack 这个问题。
hash 本来的意图是在一个很长的文档中进行锚点切换的，然而它满足这么一种特性
"改变url的同时不刷新页面"，再加上浏览器也提供 onhashchange 这样的监听事件，
顺理成章地能通过改变 hash 来进行 SPA 的导航了。
后来，这种模式大行其道，onhashchange 便被采纳到 HTML5 规范中去了（详见红宝书 P394）

下面举个例子，演示"如何通过改变 hash 值对页面进行局部刷新"

// 这里举个例子和截图 hash.gif
// 附上代码出处

注意：在第一次进入页面的时候，也会触发一次 hashchange 事件；因此，在任何时候重新刷新页面，也能触发 hash 值对应的状态。
问题：虽然用 hash 可以解决 SPA 的路由问题，但是 url 上会有一个 # 号，很不美观。
答案：抛弃 hash，用 history 代替它

# history 的演进
很早之前，浏览器便实现了 history，然而，早期的 history 只能用于多页面之间进行导航，比如
详见红宝书P215
```js
history.go(-1);  // 后退一页
history.go(2); // 前进两页页
history.forward();  // 前进一页
history.back(); // 后退一页
```


在 HTML5 规范中，history 新增了以下几个 API（详见红宝书 P491）
```js
history.pushState(); // 添加新的状态到历史状态栈
history.replaceState();  // 用新的状态代替当前状态
history.state   // 返回当前状态对象
```
通过 pushState 或者 replaceState，就能做到"改变 url 的同时，不会刷新页面"
那这时候有什么办法能够检测到 url 的变化吗？ → 很遗憾，没有。→ 那还怎么搞？

我们来理一下思路，虽然我们没法知道 url 的改变，但是如果我们都有哪些途径会引起 url 的改变，然后在这些途径中间进行拦截，
不就也相当于监听了 url 的变化吗？
对于一个应用中，url 的改变一般只能由以下三种途径引起。

1. 通过点击浏览器的前进和后退按钮
2. 点击 a 标签
3. 用户进行了某种操作之后，通过 JS 代码直接修改路由

其实第 2 和第 3 种方法可以合起来看，因为 a 标签的默认事件可以被禁止，用 JS 方法代替。
关键是第 1 种，HTML5 规范中新增了一个 onpopstate 事件，当用户点击浏览器的前进或者后退按钮时，便会触发此回调。
好了，经过这些分析，history 的确是具备实现 SPA 路由的基础。

特别要注意的是：调用 history.pushState 和 history.replaceState，并不会触发 onpopstate 事件，详见文档：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/onpopstate


# React Router
React Router 的版本变化也是诡异，从2 到3再到4，每次的API都可谓颠覆性的改变，这次我们便以最新的 v4 版本举例吧。
// 此处缺 rrv4 的demo代码

上述 demo 的运行情况是怎么样的呢？请看下图

// 此处缺rrv4.gif

从图中我们可以看出，所谓的局部刷新，其实就是"三个 component 一直都在，当路由发生变化时，跟 url 匹配的 component 正常渲染，
跟 url 不匹配的 component 渲染为 null ，仅此而已"这跟我们 jquery 时代的 show 和 hide 是一个道理。
渲染的现象我们已经观察到了，下面我们讨论用什么思路来实现它。

# 思路分析

// 此处缺架构设计图

# 代码实现
// 此处代码参考这篇文章，我做了两处改动。

1. 不在每个 Route 里面绑定 popstate 事件，统一只绑定一次事件。在触发 popstate 的时候，从 instance 入口触发 forceUpdate；
2. 导出一个 jsHistory 对象，调用 jsHistory.pushState 就可以在 JS 对页面导航进行控制

# 参考资料

