/* global fetch:false */
import global from '../always-global/global.js'
import { Process } from '../iso-process/process.js'
global.process = Process.getProcess()
var scriptpath
var allpassed = true

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
  if (typeof message !== 'string') {
    if (message.hasOwnProperty('toString')) message = message.toString()
    else {
      try {
        message = JSON.stringify(message)
      } catch (e) {
        message = `${message}`
      }
    }
  }
  if (message !== 'kill' && !message.match(/^pass.*/i)) allpassed = false
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
  if (typeof fetch !== 'undefined') {
    // Running in browser.
    // Forward results to test server.
    fetch(
      `${location.origin}/test/done?code=${allpassed ? 0 : 1}&message=${encodeURIComponent(message)}`
    )
  } else {
    // Running in nodejs.
    // Print results directly then exit if necessary.
    if (message === 'kill') {
      // node tests done, now continue with browsers
      if (process.env.SKIP_BROWSER) {
        process.exit(allpassed ? 0 : 1)
      }
      return
    }
    var os = require('os')
    scriptpath = scriptpath || global.testfile ||
      process.argv
        .pop()
        .replace(process.env.HOME, '')
        .replace(os.homedir(), '')
        .replace(/\\/g, '/')
    if (allpassed) {
      process.stdout.write(`(node.js)\tpass\t${message.replace(/pass */, '')}\n`)
    } else {
      process.stderr.write(`(node.js)\tfail\t${message}\n`)
      process.exit(1)
    }
  }
}

if (typeof window !== 'undefined') {
  // catch errors and run finishTest on them
  window.onerror = (message, source, lineno, colno, error) => {
    finishTest(
      `message: ${message}\nline: ${lineno}\ncol: ${colno}\nfrom: ${source}\nerror: ${error}`
    )
  }

  window.addEventListener('unhandledrejection', function (event) {
    finishTest(
      `ERROR unhandled: ${event}`
    )
  })
} else if (typeof process !== 'undefined') {
  // capture and color output?
}

export default {
  finishTest: finishTest
}
