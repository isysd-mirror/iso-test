//import * as cp from 'child_process'
import * as open from 'open'
import * as os from 'os'
import * as fs from 'fs'
import * as util from 'util'
import * as path from 'path'
import * as kill from 'tree-kill'
import * as express from 'express'
import * as url from 'url'
import 'dotenv/config'
kill = kill.default
open = open.default
const home = os.homedir()
const USAGE = `Usage: iso-test <mytest.js>`
const app = express.default()
const test_port = 3001

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

const toload = path.resolve(testfile).replace(home, '').replace(/\\/g, '/')
var browser
var testpath = toload.replace(/\.(mjs|js)/, '.html')
var testurl = `http://localhost:${test_port}${testpath}`
var testscript = path.join(__dirname, 'index.js').replace(home, '').replace(/\\/g, '/')

// First run test in node unless SKIPNODE is true
// Will exit with code 1 if fail, or continue if all pass
if (typeof(process.env.SKIPNODE) === 'undefined' || process.env.SKIPNODE === 'false' || process.env.SKIPNODE === '0') require(path.join(process.cwd(), path.basename(testfile)))
// default to 5 second timeout since running externally
process.env.TEST_TIMEOUT = process.env.TEST_TIMEOUT || 5000

function killBrowser (code) {
  /*
   * Kill the browser process which was started to run the test.
   */
  kill(browser.pid, 'SIGKILL', function (err) {
    process.exit(code)
  })
}

// Serve everything in the user's home directory, in case some dependencies are not in PWD.
// Note that express will not server dotfiles.
app.use(express.static(home))

// *Do* serve .env files, unlike other dotfiles, since unit tests might need these.
app.get('*/.env', async function (req, res) {
  // Support guld scoped path
  var base = process.env.HOME
  if (process.env.HOME === '/') base = `/@${process.env.USER}`
  res.sendFile(path.join(base, req.path), { dotfiles: 'allow' })
})

// Route called by finishTest. Prints test results and initializes cleanup.
app.get('/test/done', async function (req, res) {
  var url_parts = url.parse(req.url, true)
  var query = url_parts.query
  res.send('ok')
  if (query && query.code === '0' && query.message) {
    // pass
    process.stdout.write(
      `(browser) ${toload}
pass\t${query.message}
`
    )
    killBrowser(0)
  } else {
    // fail
    if (query && query.message) {
      process.stderr.write(
        `(browser) ${toload}
fail:\t${query.message}
`
      )
    } else {
      process.stderr.write(
        `(browser) ${toload}
fail:\t${query}
`
      )
    }
    killBrowser(1)
  }
})

// Dynamic html generator to load test case.
// Creates a plain html file with only the iso-test module and your test.
app.get(testpath, async function (req, res) {
  var content = `
<!DOCTYPE html>
<html>
<head>
</head>
<body></body>
<script type="module" src="${testscript}"></script>
<script type="module" src="${toload}"></script>
</html>
`
  return res.send(content)
})

// Start the test server.
app.listen(test_port, async () => {
  // Print debug info if DEBUG.
  if (process.env.DEBUG) {
    process.stdout.write(
      `test http server listening on test port ${test_port} with pid ${process.pid}

Automatically opening (and hopefully closing)

${testurl}
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
    //if (process.platform === 'darwin' || process.platform === 'win32') 
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
    //args.push('-P')
    //args.push('iso-test')
  } else if (process.env.BROWSER === 'edge') {
    args.push('microsoft-edge')
  } else if (process.env.BROWSER === 'safari') {
    args.push('safari')
  }
  // Spawn the browser process, saving the pid for cleanup.
  browser = await open(testurl, {app: args}).catch(e => {
    process.stderr.write(e)
    process.exit(1)
  })
  setTimeout(() => {
    process.stderr.write('test timeout')
    killBrowser(1)
  }, parseInt(process.env.TEST_TIMEOUT))
})
