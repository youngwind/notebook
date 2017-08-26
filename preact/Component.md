# 前言
继上一篇之后，我们继续来看看如何实现组件的嵌套和更新功能。

# 前提：变量的解析
在研究组件嵌套的问题之前，我们先来看看："如何识别并处理 render 中的变量。举个例子：
```jsx
import {h, render, Component} from '../../preact';

class Person extends Component {
    constructor() {
        super();
        this.state = {
            name: "youngwind"
        }
    }

    render() {
        return (
            <div>
                {this.state.name}
            </div>
        )
    }
}

render(<Person />, document.body);
```
观察 render 函数，我们知道要把 this.state.name 替换成 youngwind，但是，应该怎么做呢？
猜想：是通过正则匹配 {} 然后进行替换吗？（当初 vue 的变量识别也是这么做的）
答案：不是通过正则匹配。

上面的代码经过编译打包之后，实际运行的代码为：
// 此处缺图

通过上图我们可以发现：我们并不需要自己去识别和匹配替换 this.state.name，因为通过 babel，原有的 JSX 结构已经变成 h 函数的嵌套调用。
**而所有的 {} 里面的内容也被当成函数参数传递给 h 函数，因此，我们在 h 函数中能够直接拿到 this.state.name 的值
，并不需要自己额外做什么解析的工作。**


# 组件标签
下面我们继续考察：如果在 render 中嵌套了其他的组件，情况会有什么不一样吗？
```jsx
import {h, render, Component} from '../../preact';

class Person extends Component {
    render() {
        return (
            <div>
                <Name/>
                <Age/>
            </div>
        )
    }
}

class Name extends Component {
    render(props) {
        return (
            <div>
                组件 Name
            </div>
        )
    }
}

class Age extends Component {
    render(props) {
        return (
            <div>
                组件 Age
            </div>
        )
    }
}

render(<Person />, document.body);
```

编译之后的代码如下：
// 此处缺图

观察上图，我们能够发现：
babel 在解析 jsx 结构的时候，对 组件还是普通标签的处理是类似的，都是通过一层 h 函数的包裹。
只不过，对于普通标签来说，h 函数的第一个参数是标签名（字符串型），对于组件标签来说， h 函数的第一个参数是
该组件的类函数。
所谓"通过props传递参数"，也不过是把 props当成是组件标签的 attributes，这一点跟普通标签完全一样。

到此为止，我们已经理清了以下几件事情：
1. 假如 render 中出现组件的话，组件标签的解析与普通标签的解析大同小异。
2. 由于 JSX 结构会被转换成 h 函数，因此对于不用自己去匹配替换花括号里面的变量
3. props会被当做 attributes来处理对待。

那么，我们还剩下最后一个问题：组件发生变化时，如何更新 DOM 呢？

# 组件更新
举个例子
```jsx
import {h, render, Component} from '../../preact';

class Person extends Component {
    constructor() {
        super();
        this.state = {
            name: "youngwind",
            age: 25
        }
    }

    change() {
        let {name, age} = this.state;
        this.setState({
            name: name + '啦',
            age: age + 1
        });
    }

    render() {
        return (
            <div>
                <button onclick={this.change.bind(this)}>改变</button>
                <Name name={this.state.name}/>
                <Age age={this.state.age}/>
            </div>
        )
    }
}

class Name extends Component {
    render(props) {
        return (
            <div>
                <label>姓名：</label>
                <span>{props.name}</span>
            </div>
        )
    }
}

class Age extends Component {
    render(props) {
        return (
            <div>
                <label>年龄：</label>
                <span>{props.age}</span>
            </div>
        )
    }
}

render(<Person />, document.body);
```
我们希望实现的功能是：

1. 通过 props 分别给 Name 和Age传递参数，初次渲染的时候显示 "youngwind"和25
2. 点击"改变"按钮，调用 setState，更新 Person 的state， 重新触发 Name 和 Age 的渲染。

此处逻辑较为繁复，我画了个流程图。
// 此处缺流程图

此处代码较多，我就只贴一下核心的 build 函数吧
```js
此处缺 build 函数代码
```

# 效果
最终实现的效果如下图所示
