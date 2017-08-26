# 前言
很久以前，我便知道 React 绑定事件其实本质上都是代理到 document 上的，当时为了禁止事件的冒泡，我使用了 NativeListener，
但其所以然，是不清楚的。正好最近有同时讨论这个问题，就再次探索一下。

# stopPropagation VS stopImmediatePropagation
考虑这样一种情况：document 上绑定了三个事件，有什么办法能够做到，在触发了第一个事件之后，就禁止其继续触发第二、第三个事件呢？
我的第一想法是调用 `e.stopPropagation`
举个例子
// 此处缺图 demo1

从图中我们可以看到， 在触发了事件A之后，`e.stopPropgation`并没有成功组织事件B、C的触发，为什么呢？
// 此处缺图 image1

从图中我们可以看到：
当事件 A 被触发时，说明事件流已经到达 Document 的冒泡阶段。e.stopPropagation 的作用是阻止事件流进一步捕获或者冒泡，
因此，在这里没有用。那怎么办？ **使用 stopImmediatePropagation**
stopImmediatePropagation

> 如果某个元素有多个相同类型事件的事件监听函数,则当该类型的事件触发时,多个事件监听函数将按照顺序依次执行。
如果某个监听函数执行了 event.stopImmediatePropagation()方法,
则除了该事件的冒泡行为被阻止之外(event.stopPropagation方法的作用),该元素绑定的后序相同类型事件的监听函数的执行也将被阻止。

出处：https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopImmediatePropagation
红宝书 P123页也有相应的说明

# React 事件代理
虽然我知道 React 组件中绑定的事件是会代理到 document 上去的，但是我在 官网中并未找到相关的说明。
那么，如何证明它确实是这样子的呢？ → 通过查看 Chrome 的 Event Listeners 面板查看，具体的使用方法请参考[官网](https://developers.google.com/web/tools/chrome-devtools/inspect-styles/edit-dom)
// 此处缺图 image2

从图中我们可以明显地看到：
1. 通过 addEventListener 绑定的事件是真的绑定到 #child 上；
2. 通过 onClick 绑定的事件，其实是代理到 document 上的。

# React 模拟 DOM 事件冒泡
观察下面这个例子：
// 此处缺图 demo2.gif

 由图中我们可以看到：点击 #child 的同时，也相当于点击了 #parent，这看起来"很像"DOM的事件冒泡。
 然而，导致这个现象的原因真的是因为DOM的事件冒泡吗？ → 不是的。因为按照 React 事件代理的原理，#child 和 #parent 绑定的事件本来就是代理到 document 上的，
 只有当事件流进入到 document 阶段，才会依次触发 document 上绑定的两个事件。

 后来，我发现我还是错了。如果说 #child 和 #parent 的事件都代理到 document 上，那么我们在 Event Listeners 面板中应该能查看到两个绑定在 document 上的事件，
 但实际情况是这样的。

 // 此处缺图 image3

 从图中我们可以看出：并非 #child 和 #parent 的事件直接代理到 document 上，而是 React 在 document 上绑定了一个 dispatchEvent 函数，
 在执行 dispatchEvent 函数的过程中，依次地执行了 #child 和 #parent 的事件。请注意，虽然这与直接事件代理到 document 的表现行为一致，但其本质有很大的不同，
 下面我们结合stopImmediatePropagation 的时候就会讲到。

 那这个dispatchEvent 是如何做到依次触发 #child 和 #parent 的事件的呢？我无力研究这部分的源码，只好自己构想一下，它大概是这样子的。
 ```
 // 伪代码
 function dispatchEvent(event) {
     let target = event.target;
     target.click && target.click();  // 触发点击元素的事件
     while (target.parentNode) {      // 沿 DOM 向上回溯，遍历父节点，触发其 click 事件
         target.parentNode.click && target.parentNode.click();
         target = target.parentNode;
     }
 }
 ```
 这便是 React 模拟 DOM 事件冒泡的大致原理。

# React 禁止事件冒泡
既然有"事件冒泡"，我们就得有禁止它的方法。React 官网中有提到[解决方法](https://facebook.github.io/react/docs/events.html#overview)
文档中指出：通过 React 绑定的事件，回调函数中的 event 对象 是经过 React 合成的 SyntheticEvent，和原生的 DOM 事件的 event 不是一个对象，
准确来说，在React 中， event.nativeEvent 才是原生DOM事件的那个事件对象，虽然 React 的 event 也实现了同样的 stopPropagation 方法。

因此，在 React 中，想要阻止"事件冒泡"（再强调一次，React中的冒泡只是其模拟的事件冒泡，并非真正的 DOM 事件冒泡），只需要在回调函数中调用 e.stopPropagation，
请注意，这时候的 e.stopPropagation 跟原生的 e.stopPropagation 并非一个函数。

以上这些都是官网中有的，那本文又有什么新意呢？下面是重点，请看这个例子：
// 此处缺图 demo3

从图中我们可以看到：

1. 事件流首先进入到 #child，然后触发直接绑定到 #child 上的事件。
2. 事件流沿着 DOM 向上冒泡到 document，触发 React 的 dispatchEvent 函数，从而触发 clickChild 事件。
3. 在 clickChild 事件的最后，我想要"禁止事件的进一步冒泡和触发"，所以调用了 e.stopPropagation。然而，事实上的观察结果是：
虽然成功地禁止了 clickParent 的触发，但是没能禁止"直接绑定在 document 上的事件"的触发，这并非我想要的结果。我想要的是：
"点击 #child，只触发 #child 上的事件，不要触发任何其他的事件，不管那些事件是通过什么样的途径注册的。"

让我们图解一下上述过程：

// 此处缺图 image4

结合本文开头提到的 stopImmediatePropagation，我们很容易知道问题所在。
React 合成事件对象的 e.stopPropagation 只能组织 React 模拟的 DOM 事件冒泡，并不能组织真实的 DOM 的事件冒泡，更不能
组织已经触发的元素的多个事件的依次执行。在这种情况下，就需要用到原生事件对象的 stopImmediatePropagation 函数了。

你可能会说："既然 React 都封装了 stopPropagation 了，为什么不顺便封装了 stopImmediatePropagation 呢？"
我的理解是："因为在 React 中不允许给一个组件绑定多个同类型的事件的，如果非要重复绑定，那么后绑定的事件会覆盖前面绑定的事件，这是它的设计思路。
在此设计思路下，React 便没有必要封装 stopImmediatePropagation。"


# 总结
对于 React 的合成事件对象 event 来说

1. event.stopPropagation → 用来阻止 React 模拟的事件冒泡
2. event.nativeEvent.stopPropagation → 原生事件对象的阻止 DOM 事件进一步捕获或者冒泡
3. event.stopImmediatePropagation → 没有这个函数
4. event.nativeEvent.stopImmediatePropagation  → 原生事件的对象的阻止 DOM 事件进一步捕获或者冒泡，且该元素的后续绑定的相同的事件类型也被阻止。

为了方便 debug，我写了一个demo：https://jsfiddle.net/youngwind/91es1dbx/5/





