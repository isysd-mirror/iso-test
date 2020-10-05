import * as fs from 'fs'
import * as path from 'path'
import global from '../always-global/global.js'
import { Process } from '../iso-process/process.js'
import * as http from 'http'
import * as url from 'url'
import '../dotenv/config.js'
import { testPageHandler, finishTestHandler, filehandler } from './handlers.js'
import { openBrowser } from './util.js'
global.process = Process.getProcess()

const home = global.process.options.env.HOME
const USAGE = 'Usage: iso-test <mytest.js>'
const TEST_PORT = process.env.TEST_PORT || 3001

// Validate arguments and print usage if necessary
const testfile = global.testfile = process.argv.pop()
if (testfile.endsWith('iso-test') || testfile.endsWith('server.node.js')) {
  console.log(USAGE)
  process.exit(1)
}
try {
  if (!fs.statSync(testfile).isFile()) {
    console.log(USAGE)
    process.exit(1)
  }
} catch (e) {
  console.log(USAGE)
  process.exit(1)
}

const toload = path.resolve(process.pwd, path.basename(testfile)).replace(home, '').replace(/\\/g, '/')
var testpath = toload.replace(/\.(mjs|js)/, '.html')
var testurl = `http://localhost:${TEST_PORT}${testpath}`
// __dirname not working with symlinks...
var testscript = path.resolve(process.pwd, '..', 'iso-test', 'index.js').replace(home, '').replace(/\\/g, '/')

// First run test in node unless SKIPNODE is true
// Will exit with code 1 if fail, or continue if all pass
if (typeof (process.env.SKIPNODE) === 'undefined' || process.env.SKIPNODE === 'false' || process.env.SKIPNODE === '0') require(path.join(process.env.PWD, path.basename(testfile)))

// default to 15 second timeout since running externally,
// possibly in test env like headless
process.env.TEST_TIMEOUT = process.env.TEST_TIMEOUT || 15000

// create HTTP test server
const server = http.createServer((req, res) => {
  var u = url.parse(req.url, true)
  req.query = u.query
  req.pathname = u.pathname
  if (req.pathname === testpath) testPageHandler(req, res, testscript, toload)
  else if (req.pathname === '/test/done') finishTestHandler(req, res)
  else filehandler(req, res, home)
})

// Start the test server.
server.listen(TEST_PORT, async () => {
  // Print debug info if DEBUG.
  if (process.env.DEBUG) {
    process.stdout.write(
      `test http server listening on test port ${TEST_PORT} with pid ${process.pid} and pwd ${process.env.PWD}

Automatically opening (and hopefully closing)

${testurl}

Which loads

${testscript}
${toload}
`
    )
  }
  openBrowser(testurl)
})
