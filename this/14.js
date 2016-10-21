/**
 * Created by youngwind on 2016/10/21.
 */

function foo(something) {
    this.a = something;
}

var obj1 = {};

var bar = foo.bind(obj1);
bar(2);
console.log(obj1.a);

var baz = new bar(3);
console.log(obj1.a);
console.log(baz.a);
