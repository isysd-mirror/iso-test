# iso-test

An isomorphic testing framework using nodejs and a generic browser (firefox, chrome, and chromium-browser supported, so far). Runs the same test code in both environments, and fails on any uncaught errors, or if `finishTest` is called with an argument that doesn't start with `pass`.

### Usage

Writing unit tests with iso-test is very easy. Simply import `finishTest` and call it with either `pass ${successMessage}` or `anything else is failure`.

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
| BROWSER  | chromium-browser | Browser executable to run (firefox, chrome, and chromium-browser supported) |
| HEADLESS | 0       | Run in headless mode if 1/true |
