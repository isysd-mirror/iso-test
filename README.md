# iso-test

[![Build Status](https://travis-ci.org/isysd-mirror/iso-test.svg?branch=isysd)](https://travis-ci.org/isysd-mirror/iso-test)

An isomorphic testing framework using nodejs and a generic browser (firefox, safari, chrome, and chromium supported, so far). Runs the same test code in both environments, and fails on any uncaught errors, or if `finishTest` is called with an argument that doesn't start with `pass` or `kill`.

### Usage

Writing unit tests with iso-test is very easy. Simply import `finishTest` and call it with either `pass ${successMessage}` or `fail ${failmessage}`. A third command word `kill` tells the test runner to kill any browser processes when it is passed to finishTest from the browser. All other message formats are considered fail cases.

Then to run the tests, pass your test script to the `iso-test` command.

```
iso-test yourtest.js
```

This will run the test once in node, and once in the browser indicated by the `BROWSER` environment variable.

### Examples

 + [passing test](https://github.com/isysd-mirror/iso-test/blob/isysd/pass.js)
 + [failing test](https://github.com/isysd-mirror/iso-test/blob/isysd/fail.js)
 + [error (fail) test](https://github.com/isysd-mirror/iso-test/blob/isysd/error.js)

### Configuration

Environment variables and `.env` files are used to configure iso-test. Interpreted variables are:

| Variable | Default | Description |
|----------|---------|-------------|
| BROWSER  | chromium | Browser executable to run (firefox, safari, chrome, and chromium supported) |
| HEADLESS | 0       | Run in headless mode if 1/true |
| SKIPNODE | 0       | Skip running the tests in node and only try the browser. |
| DEBUG    | 0       | Print extra debug lines. |
| TEST_TIMEOUT | 5000 | Maximum text execution time in ms. |

### Isomorphic modules

This package implements the [iso-module-boilerplate](https://github.com/isysd-mirror/iso-module-boilerplate) pattern, and is used there by default.
