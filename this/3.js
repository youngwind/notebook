/**
 * Created by youngwind on 2016/10/20.
 */


// 在严格模式下调用foo, this不会被绑定成undefined
function foo() {
    console.log(this.a);
}

var a = 2;

(function () {
    "use strict";
    foo();
})();