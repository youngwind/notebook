/**
 * Created by youngwind on 2016/10/20.
 */

function foo(a) {
    this.a = a;
}

var bar = new foo(2);

console.log(bar.a);
