var scriptpath

export function finishTest (message) {
  /*
   * Function to call upon unit-test completion.
   * Result and behavior determined by the message parameter.
   *
   * If message starts with 'pass', the test will be considered a pass, and no further action will be taken.
   * Otherwise, the test will be considered a fail, and the process will exit with status code 1.
   *
   * If called from a browser, will make a get request to the test server, forwarding the result.
   */
  var exitcode = 1
  if (message.match(/^pass.*/i)) exitcode = 0
  // If in browser, try to set the title and body to the message, for visual debugging
  if (typeof window === 'object') {
    try {
      if (window.document) window.document.title = message
      if (window.document && window.document.body) {
        window.document.body.innerText = message
      }
    } catch (e) {
      // ignore
    }
  }
  if (typeof process !== 'undefined' && process.exit) {
    // Running in nodejs.
    // Print results directly then exit if necessary.
    var os = require('os')
    scriptpath = scriptpath || global.testfile ||
      process.argv
        .pop()
        .replace(process.env.HOME, '')
        .replace(os.homedir(), '')
        .replace(/\\/g, '/')
    if (exitcode === 0) {
      process.stdout.write(`(node) ${scriptpath}\n`)
      process.stdout.write(`pass\t${message}\n`)
    } else {
      process.stderr.write(`(node) ${scriptpath}\n`)
      process.stderr.write(`fail\t${message}\n`)
      process.exit(exitcode)
    }
  } else {
    // Running in browser.
    // Forward results to test server.
    fetch(
      `http://localhost:3001/test/done?code=${exitcode}&message=${encodeURIComponent(message)}`
    )
  }
}

if (typeof window !== 'undefined') {
  // catch errors and run finishTest on them
  window.onerror = (message, source, lineno, colno, error) => {
    finishTest(
      `message: ${message}\nline: ${lineno}\ncol: ${colno}\nfrom: ${source}\nerror: ${error}`
    )
  }
} else if (typeof process !== 'undefined') {
  // capture and color output?
}

export default {
  finishTest: finishTest
}
