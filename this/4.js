/**
 * Created by youngwind on 2016/10/20.
 */

// 隐式绑定:调用位置有上下文对象

function foo() {
    console.log(this.a);
}

var obj = {
    a: 2,
    foo: foo
};

obj.foo();