# iso-test

An isomorphic testing framework using nodejs and chromium. Runs the same test code in both environments, and fails on any uncaught errors, or if `finishTest` is called with an argument that doesn't start with `pass`.

### Usage

Writing unit tests with iso-test is very easy. Simply import `finishTest` and call it with either `pass ${successMessage}` or `anything else is failure`.

##### Node

```
node yourtest.js
```

##### Browser

```
node ~/src/js/iso-test/server.js yourtest.js
```

### Examples

 + [passing test](https://github.com/isysd-mirror/iso-test/blob/isysd/pass.js)
 + [failing test](https://github.com/isysd-mirror/iso-test/blob/isysd/fail.js)
 + [error (fail) test](https://github.com/isysd-mirror/iso-test/blob/isysd/error.js)
