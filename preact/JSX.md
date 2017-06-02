# 前言
一直都想研究 React 的源码，无奈其源码太多（即便回退到第一个 Init commit 也有一万多行），看起来总是非常费劲，且没什么收获。怎么办呢？
答案：从 preact 开始看起，因为 preact 相当于一个 mini版的 react，其原理和实现API大同小异，但是 preact 的代码量非常的少，
目前版本也就 1000多行。我checkout到 2.0.1 版本，更是只有 600 行，然后其功能不少。
这确实是一个好的研究方法，值得推荐。

# 目标
问题：我们的第一个目标是什么呢？
答案：解析 JSX，然后渲染到真实的DOM中去。
举个例子。

```js
import {render} from 'preact';

render((
    <div id="foo">
        <span>Hello, world!</span>
        <button>按钮</button>
    </div>
), document.body);
```

如何做到："运行这段代码之后，就把对应的 JSX 挂载到 body 标签上呢"？

# 谁来解析JSX？
问题的难点在于：如何把 JSX 映射成 DOM 结构呢？虽然我们人眼一眼就能看出这是一个 div 嵌套了一个 span 和 button
但是要用程序去解析可没这么容易。问题的本质上一个 HTML 解析器。
要实现一个 HTML 解析器可不容易，我也没有这样的能力。怎么办呢？
答案是：babel。
babel作为一个代码转换工具，通过配置自定义函数，能够在代码运行之前就把 JSX 转换成该函数嵌套调用的结构。
具体的可以参考[这里](https://babeljs.io/docs/plugins/transform-react-jsx/) 和 [这里](https://jasonformat.com/wtf-is-jsx/)

注意，本文例子中使用的是 babel5，而不是 babel6，因此，在 .babelrc 的配置上有所差别。
不使用babel6的原因是：babel6 编译出来的这部分代码太难辨认了，还是 babel5 好看多了，
且 preact 在此commit 下也是采取 babel5。

下面是经过 babel5 转换之后的代码。
// 此处缺图

从图中我们可以看出，经过 babel转换之后，原先嵌套的 JSX，变成了嵌套的 preact.h 函数调用，大概形式如下：
```
// 请注意参数的划分
preact.h('div'
,{id:"foo"}
,preact.h('span',{style: "color:red"}, "Hello, world"})
,preact.h('button',{"class":"btn"}, "按钮"))
```

因此，问题就转化成为：如何编写这样的一个 h 函数，使得上述表达式的最终返回结果呈现出与 DOM 一样的结构呢？

# h 函数的编写
从上面可以看到：h 是这样的一个函数：第一个参数是tag名，第二个参数是attribute，其余的参数（长度不限）便是
嵌套在该tag中的 children。
由此，我们写出下面的代码：
```js
class VNode {
    constructor(nodeName, attributes, children) {
        this.nodeName = nodeName;
        this.attributes = attributes;
        this.children = children;
    }
}

function h(nodeName, attributes, ...args) {
    let children = args.length ? [].concat(...args) : null;
    return new VNode(nodeName, attributes, children);
}

```
经过 h 函数的嵌套调用，最终产生的结果如下：
// 此处缺图
从上图中，我们已经能够清晰地从数据结构中想象出真实的DOM结构。下面最后一步便是把这数据结构转化为真实的 DOM元素。

# 转化为真实 DOM
此处逻辑并不复杂，无法是一个递归的调用。
```js
function buildDOMByVNode(vNode) {
    if (typeof vNode === 'string') {
        return document.createTextNode(vNode);
    }

    let {nodeName, attributes: attrs, children} = vNode;
    if (typeof nodeName === 'string') {
        let node = document.createElement(nodeName);

        // 处理属性
        if (attrs) {
            for (let key in attrs) {
                if(!attrs.hasOwnProperty(key)) continue;
                setAttributes(node, key, attrs[key]);
            }
        }

        // 处理子元素
        if (children) {
            children.forEach(child => {
                // 递归
                let subNode = buildDOMByVNode(child);
                node.appendChild(subNode);
            });
        }
        return node;
    }
}
```
```js
// 整个 reander 的入口
// 此处的入参 vNode 便是上图中由 h 函数生成的那个结构
function render(vNode, parent) {
    let builtDOM = buildDOMByVNode(vNode);
    parent.appendChild(builtDOM);
    return builtDOM;
}
```

最终的效果如下图所示：
// 此处缺图

# 后话
目前只是实现最基本的demo，还有很多功能有待探索，比如实现 Component 类，比如 实现 DOM的diff与更新等等