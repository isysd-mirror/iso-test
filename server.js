import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import global from '../always-global/global.js'
import { Process } from '../iso-process/process.js'
import * as open from '../open/index.js'
import * as kill from '../tree-kill/index.js'
import * as http from 'http'
import * as url from 'url'
import '../dotenv/config.js'
kill = kill.default
open = open.default
global.process = Process.getProcess()
const home = global.process.options.env.HOME
const USAGE = `Usage: iso-test <mytest.js>`
const TEST_PORT = process.env.TEST_PORT || 3001
var tempdir

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
var browser
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

function rimrafSync (d) {
  /*
   * Remove directory and everything in it. (rm -rf)
   * For cleaning up temporary browser profiles.
   */
  try {
    var stat = fs.lstatSync(d)
  } catch (e) {
    if (process.env.DEBUG) console.warn(e)
  }
  if (stat && stat.isDirectory()) {
    var flist = fs.readdirSync(d)
    flist.forEach(f => rimrafSync(path.join(d, f)))
    fs.rmdirSync(d)
  } else if (stat && (stat.isFile() || stat.isSymbolicLink())) {
    fs.unlinkSync(d)
  }
}

function killBrowser (code) {
  /*
   * Kill the browser process which was started to run the test.
   * When done, also kill this test server process.
   */
  kill(browser.pid, 'SIGKILL', function (err) {
    if (err) console.error(err)
    if (tempdir) rimrafSync(tempdir)
    process.exit(code)
  })
}

// Serve static files
export async function filehandler (req, res) {
  // forbid dotfiles in home
  if (req.pathname.startsWith('/.')) {
    res.writeHead(401)
    res.end('Forbidden')
  } else {
    // send the file
    // Support guld scoped path
    var fp = path.join(home, req.pathname)
    if (process.env.DEBUG) {
      process.stdout.write(`Request for file:\t${fp}
`)
    }
    fs.readFile(fp, { encoding: 'utf8' }, (e, f) => {
      if (f) {
        // try to guess mime type, at least supporting JS...
        var mime = 'text/plain'
        if (fp.endsWith('js')) mime = 'application/javascript'
        res.writeHead(200, { 'Content-Type': mime })
        res.end(f)
      } else {
        res.writeHead(404)
        res.end(`No ${req.pathname} found`)
        if (process.env.DEBUG) {
          process.stdout.write(`No ${fp} found
`)
        }
      }
    })
  }
}

// Route called by finishTest. Prints test results and initializes cleanup.
function finishTestHandler (req, res) {
  var urlParts = url.parse(req.url, true)
  var query = urlParts.query
  if (process.env.DEBUG) {
    process.stdout.write(`query:\t${JSON.stringify(query, null, 2)}
`)
  }
  if (query && query.code === '0' && query.message.startsWith('pass')) {
    // pass
    process.stdout.write(
      `(browser)\tpass\t${query.message.replace(/pass */, '')}
`
    )
    res.writeHead(200)
    res.end()
  } else if (query.message === 'kill') {
    // done testing, kill the browser
    killBrowser(0)
  } else {
    // fail
    if (query && query.message) {
      process.stderr.write(
        `(browser)\tfail:\t${query.message}
`
      )
    } else {
      process.stderr.write(
        `(browser)\tfail:\t${query}
`
      )
    }
    res.writeHead(200)
    res.end()
    killBrowser(1)
  }
}

// Dynamic html generator to load test case.
// Creates a plain html file with only the iso-test module and your test.
function testPageHandler (req, res) {
  var content = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script type="module">
  import global from '../always-global/global.js'
  import { Process } from '../iso-process/process.js'
  global.process = Process.getProcess()
  global.process.options.env = global.process.options.env || {}
  global.process.options.env = Object.assign(global.process.options.env, ${JSON.stringify(process.env)})
  import '${testscript}'
</script>
</head>
<body></body>
<script type="module" src="${toload}"></script>
</html>
`
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(content)
}

// create HTTP test server
const server = http.createServer((req, res) => {
  var u = url.parse(req.url, true)
  req.query = u.query
  req.pathname = u.pathname
  if (req.pathname === testpath) testPageHandler(req, res)
  else if (req.pathname === '/test/done') finishTestHandler(req, res)
  else filehandler(req, res)
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
  // Sense browser and arguments from environment variables.
  var args = []
  process.env.BROWSER = process.env.BROWSER || 'chromium-browser'
  if (process.env.BROWSER.indexOf('chromium') > -1) {
    if (process.platform === 'win32' || process.platform === 'darwin') args.push('chromium')
    else args.push('chromium-browser')
    args.push('--temp-profile')
    if (
      process.env.HEADLESS &&
      process.env.HEADLESS !== '0' &&
      process.env.HEADLESS !== 'false'
    ) {
      args.push('--headless')
    }
  } else if (process.env.BROWSER.indexOf('chrom') > -1) {
    if (process.platform === 'darwin') args.push('google chrome')
    else if (process.platform === 'win32') args.push('chrome')
    else args.push('google-chrome')
    args.push('--temp-profile')
    if (
      process.env.HEADLESS &&
      process.env.HEADLESS !== '0' &&
      process.env.HEADLESS !== 'false'
    ) {
      args.push('--headless')
    }
  } else if (process.env.BROWSER.startsWith('firefox')) {
    // if (process.platform === 'darwin' || process.platform === 'win32')
    args.push('firefox')
    // maybe use headless
    if (
      (process.env.MOZ_HEADLESS &&
      process.env.MOZ_HEADLESS !== '0' &&
      process.env.MOZ_HEADLESS !== 'false') ||
      (process.env.HEADLESS &&
      process.env.HEADLESS !== '0' &&
      process.env.HEADLESS !== 'false')
    ) {
      process.env.HEADLESS = process.env.MOZ_HEADLESS
      args.push('--headless')
    }
    // create a test profile
    args.push('--profile')
    tempdir = path.join(os.tmpdir(), `iso-test-${Date.now()}`)
    fs.mkdirSync(tempdir)
    args.push(tempdir)
  } else if (process.env.BROWSER === 'edge') {
    args.push('microsoft-edge')
  } else if (process.env.BROWSER === 'safari') {
    args.push('safari')
  }
  // Spawn the browser process, saving the pid for cleanup.
  browser = await open(testurl, { app: args }).catch(e => {
    process.stderr.write(e)
    process.exit(1)
  })
  setTimeout(() => {
    process.stderr.write(`(browser)\tfail\ttest timeout
`)
    killBrowser(1)
  }, parseInt(process.env.TEST_TIMEOUT))
})
