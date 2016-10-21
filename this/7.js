/**
 * Created by youngwind on 2016/10/20.
 */

function foo() {
    console.log(this.a);
}

function doFoo(fn) {
    fn();
}

var obj = {
    a: 2,
    foo: foo
};

var a = "oops, global";

doFoo(obj.foo);