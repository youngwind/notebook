# 前言
在上一篇中,我们实现了webpack的code-splitting功能。今天,我们来实现loader机制。

# 问题
以加载less为例。
```
example.js

require('./style.less');
```

```less
@color: #000fff;

.content {
    width: 50px;
    height: 50px;
    background-color: @color;
}
```
按照 webpack 的官方文档,需要配置 'style-loader','css-loader',和'less-loader'这三个loader。
观察最后生成的 output.js,我们能够发现以下问题:

1. 既然CSS能被插入到HTML的head标签里面,必然有一段插入DOM的程序,这一段程序无疑会被包含在 output.js 中,而且这一段程序的提供者是 style-loader.
2. 谁负责将less代码转化为css代码呢?是less-loader。但是,这个转换功能本身一定不是webpack所完成的,而是调用了 less 这个package来完成。
webpack只不过再起基础上封装了一个函数调用而已。
3. style-loader 和 less-loader 的作用我已经知道了,那么 'css-loader'呢?虽然平常配置webpack的时候总是这么写 `style-loader!css-loader!less-loader`,
但是我从未真正搞清楚 css-loader 的作用。→ 后来在看其源码的时候猜测其应为处理 css 的import功能。

开始动手前的思考就这么多。为了降低初次实现的复杂度,我们不考虑import css的情况,所以无需实现 css-loader,只需要
集中精力考虑一个问题:如何通过loader机制,将less代码转化为css代码,然后又将其插入到DOM中?
举个例子。


# 思路分析
这个问题很抽象,我们尝试从最终的数据结构反推其是实现方式。最终拼接出来的JS请参考这里的 output.js ,仔细观察output.js,我们能够发现:

1. 定义css的代码在模块3里面,要注意:其代码已经被less解析过且在前面加了一个 module.exports作为 JS 模块的导出。
2. 将css代码插入到head里面的JS代码在模块2中。(另外,我在项目中明明不包含模块2的代码,看来这模块2的代码是从 node-modules/style-loader里面读取出来的。)
3. 启动这个插入任务的JS代码在模块1中, require(2)(require(3))。这一句代码理解起来并不困难,就是require(3)导出了css代码,作为参数传递给模块2。
但是,难就难在这一句代码是webpack拼接出来的?webpack如何知道要拼接这样复杂的代码的呢?
4. 模块0是 example.js 中的代码

说到这儿,还是很抽象,我们再深入一层,观察构建出来的depTree对象。
// 此处缺depTree截图

观察此数据结构,我们能够发现。

1. 一共有4个module,分别是: example.js、style-loader!less-loader!style.less、addStyle.js和 less-loader!style.less。
2. module之间的依赖关系是:example依赖style.less, !style-loader!less-loader!style.less依赖 addStyle 和 less-loader!style.less

问题点在于:在之前的实现中,每一个module的出现,都是因为被require才会出现的(除了主入口JS)。
但是,这里怎么忽然冒出一个 style-loader!less-loader!style.less这一个module?而且,为什么这个module又依赖于addStyle.js 和 less-loader!style.less?
这个问题困扰了我相当长的时间。

# loaders的拆解
其实那个长长地名字"style-loader!less-loader!style.less"会出现,正是因为 example.js require了 style.less。less文件不同于普通的JS文件,
不会直接被当做一个module来处理。按照loader的思路, less文件会被若干个loader转换之后才会成为JS module。
如下面代码所示:
```JS
// buildDep.js

//.....
// 查找模块
let absoluteFileName = yield _resolve(moduleName, context, options.resolve);
// 用模块的绝对路径作为模块的键值,保证唯一性
module = depTree.modules[absoluteFileName] = {
    id: mid++,
    filename: absoluteFileName,
    name: moduleName
};

let filenameWithLoaders = absoluteFileName;
let loaders = absoluteFileName.split(/!/g);
let filename = loaders.pop();
if(!filename) {
    throw `找不到文件${filename}`;
}
let source = fs.readFileSync(filename).toString();

// 处理 loader
let ret = yield execLoaders(filenameWithLoaders, loaders, source, options);

let parsedModule = parse(ret);
module.requires = parsedModule.requires || [];
//.....


/**
 * 运算加载器
 * 不同种类的文件对应不同系列的加载器,比如: less 文件对应 style-loader 和 less-loader(先不考虑 css-loader)
 * 这些 loader 本质上是一些处理字符串的函数,输入是一个字符串,输出是另一个字符串,以队列的形式串行执行。
 * @param {string} request 相当于 filenamesWithLoader ,比如 /Users/youngwind/www/fake-webpack/node_modules/fake-style-loader/index.js!/Users/youngwind/www/fake-webpack/node_modules/fake-less-loader/index.js!/Users/youngwind/www/fake-webpack/examples/loader/style.less
 * @param {array} loaders 此类型文件对应的loaders
 * @param {string} content 文件内容
 * @param {object} options 选项
 * @returns {Promise}
 */
function execLoaders(request, loaders, content, options) {
    return new Promise((resolve, reject) => {
        if (!loaders.length) {
            resolve(content);
            return;
        }

        let loaderFunctions = [];
        loaders.forEach(loaderName => {
            let loader = require(loaderName);
            // 每个loader 本质上是一个函数
            loaderFunctions.push(loader);
        });

        nextLoader(content);

        /***
         * 调用下一个 loader
         * @param {string} content 上一个loader的输出字符串
         */
        function nextLoader(content) {
            if (!loaderFunctions.length) {
                resolve(content);
                return;
            }
            // 请注意: loader有同步和异步两种类型。对于异步loader,如 less-loader,
            // 需要执行 async() 和 callback(),以修改标志位和回传字符串
            let async = false;
            let context = {
                request,
                async: () => {
                    async = true;
                },
                callback: (content) => {
                    nextLoader(content);
                }
            };

            // 就是在这儿逐个调用 loader
            let ret = loaderFunctions.pop().call(context, content);
            if(!async) {
                // 递归调用下一个 loader
                nextLoader(ret);
            }

        }
    });

}
```
在这里,我们要注意,loader也有同步和异步的区别。想style-loader是同步的,它直接return另一个字符串。
但是less-loader是异步的,因为less.render方法是异步的,所以我们需要传递回调函数进去。

由上面的代码我们可以看出: loader与loader之间用'!'进行分界,程序会从右到左逐个读取loader,并将上一个loader的输出作为输入传递进去。
那么,在本文中,首先识别处理的就是 less-loader,我们来看看 less-loader 的源码。

# less-loader
```js
const less = require('less');

module.exports = function (source) {
    // 声明此 loader 是异步的
    this.async();
    let resultCb = this.callback;
    less.render(source, (e, output) => {
        if (e) {
            throw `less解析出现错误: ${e}, ${e.stack}`;
        }
        resultCb("module.exports = " + JSON.stringify(output.css));
    });
}
```
从这儿我们可以看出,less-loader本质上是调用了less.render方法。并且通过传递callback等参数获得less异步解析之后的css代码。接下来我们看下一个loader: style-loader

# style-loader的再require
翻开 node_module中的 style-loader,我们看到如下的源码:
```js
const path = require('path');
module.exports = function (content) {
    let loaderSign = this.request.indexOf("!");
    let rawCss = this.request.substr(loaderSign);
    return "require(" + JSON.stringify(path.join(__dirname, 'addStyle')) + ")" +
        "(require(" + JSON.stringify(rawCss) + "))";
};
```
输入 content是:/Users/youngwind/www/fake-webpack/node_modules/style-loader-fake/index.js!/Users/youngwind/www/fake-webpack/node_modules/less-loader-fake/index.js!/Users/youngwind/www/fake-webpack/examples/loader/style.less
输出的字符串是: require("/Users/youngwind/www/fake-webpack/node_modules/style-loader-fake/addStyle")(require("!/Users/youngwind/www/fake-webpack/node_modules/less-loader-fake/index.js!/Users/youngwind/www/fake-webpack/examples/loader/style.less"))

重点就在这儿!! style-loader将自身切割出来,然后又引入了两个require,这就是前面提到的, style-loader!less-loader!style.less依赖于addStyle和less-loader!style.less的原因所在!

# resolve的逐级查找
在之前的文章中曾经提到过, resolve查找文件的时候,可能需要实现类似node-modules的逐层查找功能。不过那时候因为此功能非必须,所以就没有理会它。
但是,在实现loader机制的时候,就必须实现模块的逐级查找。
因为 style-loader和less-loader 但是 node-modules里面的模块,其安装查找方式应遵循跟NodeJS一致的方式。代码如下:
```js
/**
 * 根据 loaders / 模块名,生成待查找的路径集合
 * @param {string} context 入口文件所在目录
 * @param {array} identifiers 可能是loader的集合,也可能是模块名
 * @returns {Array}
 */
function generateDirs(context, identifiers) {
    let dirs = [];
    for (let identifier of identifiers) {
        if (path.isAbsolute(identifier)) {
            // 绝对路径
            if (!path.extname(identifier)) {
                identifier += '.js';
            }
            dirs.push(identifier);
        } else if (identifier.startsWith('./') || identifier.startsWith('../')) {
            // 相对路径
            dirs.push(path.resolve(context, identifier));
        } else {
            // 模块名,需要逐级生成目录
            let ext = path.extname(identifier);
            if (!ext) {
                ext = '.js';
            }
            let paths = context.split(path.sep);
            let tempPaths = paths.slice();
            for (let folder of tempPaths) {
                let newContext = paths.join(path.sep);
                dirs.push(path.resolve(newContext, './node_modules', `./${identifier}-loader-fake`, `index${ext}`));
                paths.pop();
            }
        }
    }
    return dirs;
}
```
比如对于 style-loader来说,其待查找路径集合为:
```json
[
  "/Users/youngwind/www/fake-webpack/examples/loader/node_modules/style-loader-fake/index.js",
  "/Users/youngwind/www/fake-webpack/examples/node_modules/style-loader-fake/index.js",
  "/Users/youngwind/www/fake-webpack/node_modules/style-loader-fake/index.js",
  "/Users/youngwind/www/node_modules/style-loader-fake/index.js",
  "/Users/youngwind/node_modules/style-loader-fake/index.js",
  "/Users/node_modules/style-loader-fake/index.js",
  "/Users/youngwind/www/fake-webpack/bin/node_modules/style-loader-fake/index.js"
]
```

至此,我们就能实现通过loader加载less文件了。


