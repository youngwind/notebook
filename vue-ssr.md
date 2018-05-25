# 前言
Vue SSR 出了很久了，现在才开始研究，惭愧。最近新接手一个项目，典型的 Vue 前端渲染，后期优化可能会做服务端渲染，所以就先来做个技术储备吧。
如果对 Vue SSR 完全不了解，请先看官方文档：https://ssr.vuejs.org/

# 思路
Vue 官方提供了一个很完善的 Demo，但是功能太多，新手看起来会比较蒙。所以，让我们来写个简单点的。

我们分四步走：

1. 写一个简单的纯前端渲染 demo（不包含异步数据获取）
2. 从纯前端渲染改成后端渲染（也不包含异步数据获取）
3. 在第 2 步的基础上，加上异步数据的获取，使用官方提供的架构（vue2.0+ vuex)
4. 在第 3 步的基础上，重新改写，以达到对原有项目改动最小的目标
我们的思路是：先写一个前端渲染的项目，然后将它改造成服务端渲染（同时兼容前端渲染）

问题点：官方提供的 demo 里面，是 Vue2.0 + vue-router + vuex ，但是，vue-router 和 vuex 都是必须的吗？
答案：vue-router 不是必须的，本文的 demo 就只有一个页面，不需要 vue-router;
vuex 是必须的吗？也不是，https://github.com/vuejs/vue-hackernews-2.0/issues/91  但是如果你不用 vuex 的话，你就得自己实现一个类似 vuex 的（原因后面会谈到），

所以，本文的 demo 只使用 vuex，而不使用 vue-router



# 第一步：纯前端渲染 demo
源码看这里：https://github.com/youngwind/vue-ssr-demo/tree/dac42ccad57097d9fc771bcea88ebab4d0b74375
下面贴一下主要的代码
```html
// index.html
<body>
<div id="app">
    <app></app>
</div>
<script src="./dist/web.js"></script>  // 这是打包出来的 JS 文件
</body>

```
```js
// app.js webpack 打包入口
const Vue = require('vue');
const App = require('./App.vue').default;

var app = new Vue({
    el: '#app',
    components: {
        App
    }
});
```
```vue
// App.vue
<template>
    <div>
        <foo></foo>
        <bar></bar>
    </div>
</template>
<script>
    import Foo from './components/Foo.vue';
    import Bar from './components/Bar.vue';
    export default {
        components:{
            Foo,
            Bar
        }
    }
</script>
```
```vue
// Foo.vue
<template>
    <div class='foo'>
        <h1>Foo</h1>
        <p>Component </p>
    </div>
</template>
<style>
    .foo{
        background: yellow;
    }
</style>
```
```vue
// Bar.vue
<template>
    <div class='bar'>
        <h1>Bar</h1>
        <p>Component </p>
    </div>
</template>
<style>
    .bar{
        background: blue;
    }
</style>
```

# 第二步：后端渲染 Demo
源码参考这里：https://github.com/youngwind/vue-ssr-demo/tree/706d050db481683914751e34e82f98f89ce8050b
观察第一步的demo，要把它改成后端渲染，需要从哪几个方面着手呢？

1. 拆分入口
2. 拆分打包配置。
3. 服务端渲染主体逻辑

## 拆分入口
纯前端渲染的时候，只需要一个入口 app.js。现在做后端渲染，需要两个入口 entry-client.js 和 entry-server.js 分别给浏览器和服务器使用。
先看 entry-client.js ，它跟第一步中的 app.js 有什么不一样的呢？ → 没有区别，只是改个文件而已。你在这版本中源码发现不一样，那只是我换了一个写法，你用第一步中 app.js 代替它也是完全可以的。
再看 entry-server.js ，
```js
// entry-server.js 主体逻辑
const Vue = require('vue');
const App = require('./App.vue').default;
function createApp() {
    const app = new Vue({
        render: h => h(App)
    });
    return app;  // 用 App.vue 作为 new Vue 的入口
};

module.exports = createApp;  // 导出一个函数
```
entry-server.js 与 entry-client.js主要有两个区别
1. entry-client.js 需要在端执行，所以需要指定一个 el ，并且调用 $mount 挂载到对应的 DOM 上。
2. entry-client 无须导出东西，因为它是浏览器使用的，但是 entry-server.js 必须导出一个函数，因为它要被服务器调用（同时需要配合到 webpack 配置的改动，下面会谈到）

## 拆分打包配置
在第 1 步中，只需要 webpack.config.js 一个打包配置，因为只会打包出一个供浏览器使用的 JS 文件。现在我们后端渲染和前端初始化分别需要
一个 JS 文件，而且他们的入口和逻辑不是完全一样的，所以我们需要两份打包配置：webpack.server.conf.js 和 webpack.client.conf.js，它们公共的部分抽象在
webpack.base.conf.js里面。
（当然，后端渲染的时候也可以不用打包出来的 JS，而直接使用 .vue 文件源码。但是，由于我接手业务的特点，只能采取打包之后的 JS 做后端渲染，所以本文的 demo 以
打包JS做后端渲染作为例子）
关于 webpack.server.conf.js 有两个要注意的点：
1.  libraryTarget: 'commonjs2'，因为服务端需要一个 CommonJS 规范的模块:https://webpack.js.org/configuration/output/#module-definition-systems
2. target: 'node', 指定环境，不然编译的时候会报特定 API 错误

## 服务端渲染主体逻辑
vue-server-render 入口支持两种格式：createRenderer 和 createBundleRenderer，前者以 Vue组件为入口，后者以打包后的 JS 文件作为入口。
由于业务的特点，我只能选择 createBundleRenderer，这也是上面需要需要 webpack.server.conf.js 配置文件的原因。直接使用 .vue 文件作为入口请读者自行探索。
```js
// server.js
const bundle = fs.readFileSync(path.resolve(__dirname, 'dist/server.js'), 'utf-8');
const renderer = require('vue-server-renderer').createBundleRenderer(bundle, {
    template: fs.readFileSync(path.resolve(__dirname, 'dist/index.ssr.html'), 'utf-8')
});
// 创建 vue ssr renderer


server.get('/index', (req, res) => {
    renderer.renderToString((err, html) => {
        if (err) {
            console.error(err);
            res.status(500).end('服务器内部错误');
            return;
        }
        res.end(html);
    })
});


server.listen(8002, () => {
    console.log('后端渲染服务器启动，端口号为：8002');
});
```
下面是最终渲染结果：
此处缺图

# 第三步：后端渲染 + 预获取数据
这是关键的一步。
第二步中的组件是不涉及到 ajax 数据的获取的，那如何处理 ajax 请求呢？官方文档给我们指出了思路：

1. 在开始渲染之前，预先获取所有组件需要的 ajax 数据
2. 后端渲染，同时将通过 __init_state 埋在页面中传递到前端
3. 前端接管数据

下面我们谈几个重点
## 预先获取数据
需要解决两个问题。
第一，如何知道哪些组件需要预获取数据？ → 定义一个方法：ayncData
```js
// Bar.uve
asyncData() {
  // 省略代码，这里面做 ajax 逻辑的处理
}
```
这样，有 asyncData 方法的组件，就代表需要预先获取数据。

第二，如何索引到这个 asyncData 方法呢？

Vue 的官方demo里面使用的是 vue-router，所以，它可以通过 vue-router 来匹配 url 命中的组件，从而所以到 asyncData
```js
const matchedComponents = router.getMatchedComponents()
    if (!matchedComponents.length) {
      return reject({ code: 404 })
    }

    // call `asyncData()` on all matched route components
    Promise.all(matchedComponents.map(Component => {
      if (Component.asyncData) {
        return Component.asyncData()
      }
    })).then(() => {
    // 预先获取的数据都获取到之后，再做其他处理
      })

      resolve(app)
```
然而，基于业务的特点，我并不需要用到 vue-router。第四步会讲到我是如何索引到 asyncData 方法的

## 数据的存储与传递
这个问题也解释了为什么必须使用 vuex 的原因。（3个原因）
设想：在做服务端渲染之前，Bar 组件是这么获取数据的：在mounted 生命周期调用 ajax 方法，将返回的数据写到自身的 data 里面，这是最常见的写法，也是我当前项目的写法。
所以，我首先想到的是，当我预先获取到数据之后，能不能也把数据存在 Bar 的data 中呢？结论是不行。原因是：在服务端渲染的情况下，当预先获取到数据之后，vue 组件还没开始
渲染，也就是说vue组件还没开始实例化，因此我根本无法把数据挂载在 Bar 组件实例的 data 上面。在数据都预先获取完时，我得把数据存在某个地方，当 vue 组件开始渲染的时候再取出来。
这就是需要 vuex 的原因，因为我们需要一个独立于视图之外的，存放数据、管理数据的地方。

这部分相关的代码示例如下：
```js
// store.js 初始化 store
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function fetchMsg () {
    return new Promise((resolve, reject) => {
        resolve('ajax数据');
    })
}

export function createStore () {
  return new Vuex.Store({
    state: {
      msg: ''
    },
    actions: {
      fetchMsg ({ commit }) {
        return fetchMsg().then(msg => {
          commit('setMsg', {msg})
        })
      }
    },
    mutations: {
      setMsg (state, { msg }) {
        Vue.set(state.msg, msg)
      }
    }
  })
}
```
```vue
// Bar.vue
asyncData ({ store}) {
// 通过 store 触发 ajax 请求
    return store.dispatch('setMsg');
  },

  computed: {
    // 从 store 中取数据放到实例中
    msg () {
      return this.$store.state.msg
    }
  }
```
关于数据，还有一个问题解决。前端渲染的时候需要用到预先获取到的数据，为什么呢？由于后端已经把数据转换成 html 了，貌似前端已经没有必要用到数据了。
不，不是这样的。前端也需要用到跟后端一样的数据，为什么呢？设想，你写是一个列表组件，用了 v-for 遍历数据，列表的每一行都绑定一个 click 事件。后端渲染的时候虽然把整个
列表的 html 都渲染出来了，但是 click 事件的绑定还是需要在浏览器中完成的，如果没有数据，组件又如何进行 click 事件的绑定呢？（要通过 v-for 解析出每一行的数据）。
那么，后端预先获取到的数据如何传递给浏览器呢？→ 通过在html中埋入  window.__INITIAL_STATE__
这个 __INITIAL_STATE 是 vue-server-render 自动埋入的，那它怎么知道要埋入哪些数据呢？
答案在这儿：
```js
// entry-server.js
// context 是 vue-server-render 执行此方法的时候往里面注入的参数
module.exports = function (context) {
    // 此处省略其他代码
    const store = createStore();
    let app = new Vue({
        store,
        render: h => h(App)
    });

    // ... 省略其他代码
    return Promise.all(prefetchFns).then((res) => {
        // .. 省略其他代码
        context.state = store.state;
        // context.state 的值是什么，window.__INITIAL_STATE__ 就是什么
        // 这里的 store 就是上面说到的统一存放管理数据的地方
        return app;
    });

};

```
至此，我们就已经完成了使用 vuex 进行服务端渲染了。

# 第四步：进一步封装 vuex
接第三步，虽然我们已经成功地预获取数据并进行服务端渲染，但是，它有一个缺点：对于旧有不使用 vuex 的项目，这种改造对原有组件的的改动太大了。
我项目中的组件大多数是这样的：
```vue
export default {
        data() {
            return {
                msg: ''
            }
        },

        mounted() {
           this.fetchData();
        },
        methods: {
           fetchData(){
                $.ajax().then(res => {
                    this.msg = res;
                })
           }
        }
    }
```
改造工作量的原因是：如果要用 vuex 的话，就得总 action、mutations 那一套，
得把 ajax 请求的代码搬到 store 中去，每个组件得多一个 computed。如果组件数量多的话，还得分割 store，而且还得要求项目开发者都会 vuex ，这无形中增加了学习和协作的成本。
有什么办法能够最低限度地降低对旧有组件的改造呢？ → vuex 是肯定要用的（因为得有独立于视图的存放管理数据的地方），但是我们可以简化 vuex 的操作，将 vuex 封装在服务端渲染内部，对组件开发者不可见。
具体的做法如下：
```vue
// App.vue
<template>
    <div>
        <h1>App.vue</h1>
        <p>vue with vue </p>
        <hr>
        <foo1 ref="foo_ref"></foo1>
        <bar1 ref="bar_ref2"></bar1>
        <bar2 ref="bar_ref3"></bar2>
    </div>
</template>
<style>
    h1 {
        color: red
    }
</style>
<script>
    import './registerGlobals'
    import Foo from './components/Foo.vue';
    import Bar from './components/Bar.vue';

    export default {
        data(){
            return {
                a:1,
                b:2
            }
        },
        components: {
            foo1: Foo,
            bar1: Bar,
            bar2: Bar   // 一个组件可能有多个实例，名字不一样（这也是我项目的特点），此处要注意
        }
    }
</script>
```
```vue
// Bar.vue 预先获取数据的定义
// 把原来 fetchData 方法里面的内容搬到 prefetchData 函数里面，tagName 是传进去的函数（后面会讲到）
// data 当做是 ajax 请求回来的数据
prefetchData: function (tagName) {
            return new Promise((resolve, reject) => {
                resolve({
                    tagName,  // bar1 或者 bar2
                    data: '123'
                });
            })
        },
```

```js
// store.js
// action、mutations 等都没有了，只剩下一个 state
module.exports =  function createStore() {
    return new Vuex.Store({
        state: {}
    })
};

```
```js
// entry-server.js
module.exports = function (context) {
    const store = createStore();
    let app = new Vue({
        store,
        render: h => h(App)
    });
    let components = App.components;
    let prefetchFns = [];
    for (let key in components) {
    // key 就是 root 组件所包含的其他子组件的组件名，也就是 tagName 参数
        if (!components.hasOwnProperty(key)) continue;
        let component = components[key];
        if (component.prefetchData) {
            prefetchFns.push(component.prefetchData(key));
        }
    }

    return Promise.all(prefetchFns).then((res) => {
        res.forEach((item, key) => {
        // 直接把预先获取到数据写到 store 中，区分的键值就是 bar1、bar2、foo 等组件名字
            Vue.set(store.state, `${item.tagName}`, item.data);
        });
        context.state = store.state;
        return app;
    });

};

```
最后还需要处理 computed，我把它做成一个 mixin
```js
// ssrmixin.js
export default {
    computed: {
        prefetchData () {
            let componentTag = this.$options._componentTag; // bar1,bar2或者 foo
            return this.$store.state[componentTag];
            // 这里每个组件都能从 prefetchData 属性中拿到预先获取的数据了
        }
    }
}

// registerglobals.js
import Vue from 'vue'
import ssrMixin from './ssrmixin.js';

if (!Vue.globalsRegistered) {
  Vue.globalsRegistered = true;
  Vue.mixin(ssrMixin);
}
```
至此，我们就大功告成了！这一版的源码请参考这里：

# 效果
既然说服务端渲染能够提高首次加载速度，那我们当然得验证一下啦。如下图的对比




