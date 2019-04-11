import * as cp from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as kill from 'tree-kill'
import * as chalk from 'chalk'
import * as express from 'express'
import * as url from 'url'
import 'dotenv/config'
chalk = chalk.default
kill = kill.default
const spawn = cp.spawn
const home = os.homedir()
const USAGE = `Usage: iso-test <mytest.js>`
const app = express.default()
const test_port = 3001

// Validate arguments and print usage if necessary
if (process.argv.length <= 2) {
  console.log(USAGE)
  process.exit(1)
}
try {
  if (!fs.statSync(process.argv[2]).isFile()) {
    console.log(USAGE)
    process.exit(1)
  }
} catch (e) {
  console.log(USAGE)
  process.exit(1)
}

const toload = path.resolve(process.argv[2]).replace(home, '')
var browser
var testpath = toload.replace(/\.(mjs|js)/, '.html')
var testurl = `http://localhost:${test_port}${testpath}`
var testscript = path.join(__dirname, 'index.js').replace(home, '')

// First run test in node
// Will exit with code 1 if fail, or continue if all pass
require(process.argv[2])

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
  res.sendFile(path.join(process.env.HOME, req.path), {dotfiles: "allow"})
})

// Route called by finishTest. Prints test results and initializes cleanup.
app.get('/test/done', async function (req, res) {
  var url_parts = url.parse(req.url, true)
  var query = url_parts.query
  res.send('ok')
  if (query && query.code === '0' && query.message) {
    // pass
    console.log(chalk.green(`(browser) ${toload}
pass\t${query.message}
`))
    killBrowser(0)
  } else {
    // fail
    if (query && query.message) {
      console.error(chalk.red(`(browser) ${toload}
fail:\t${query.message}
`))
    } else {
      console.error(chalk.red(`(browser) ${toload}
fail:\t${query}
`))
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
app.listen(test_port, () => {
  // Print debug info if DEBUG.
  if (process.env.DEBUG) console.log(`test http server listening on test port ${test_port} with pid ${process.pid}

Automatically opening (and hopefully closing)

${testurl}
`)
  // Sense browser and arguments from environment variables.
  var args = []
  process.env.BROWSER = process.env.BROWSER || 'chromium-browser'
  if (process.env.BROWSER.startsWith('chrom')) {
    args.push('--temp-profile')
  } else if (process.env.BROWSER.startsWith('firefox')) {
  }
  if (process.env.HEADLESS && process.env.HEADLESS !== '0' && process.env.HEADLESS !== 'false') {
    args.push('--headless')
  }
  args.push(testurl)
  // Spawn the browser process, saving the pid for cleanup.
  browser = spawn(process.env.BROWSER, args)
})

