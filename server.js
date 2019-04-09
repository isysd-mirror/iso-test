const { spawn } = require('child_process')
var os = global.os = require('os')
var path = global.path = require('path')
const home = os.homedir()
const kill = require('tree-kill')
const chalk = require('chalk')
const express = require('express')
const app = express()
var url = require('url')
const test_port = 3001

var browser
var toload = path.resolve(process.argv[2]).replace(home, '')
var testpath = toload.replace(/\.(mjs|js)/, '.html')
var testurl = `http://localhost:${test_port}${testpath}`
var testscript = path.join(__dirname, 'index.js').replace(home, '')

function killBrowser (code) {
  kill(browser.pid, 'SIGKILL', function (err) {
    process.exit(code)
  })
}

app.use(express.static(home))

app.get('*/.env', async function (req, res) {
  res.sendFile(path.join(process.env.HOME, req.path), {dotfiles: "allow"})
})

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

app.listen(test_port, () => {
  console.log(`test http server listening on test port ${test_port} with pid ${process.pid}

Automatically opening (and hopefully closing)

${testurl}
`)
  browser = spawn('chromium-browser', [
    '--temp-profile',
    testurl
  ])
  //    browser.stdout.on('data', (data) => {
  //      console.log(`browser stdout: ${data}`)
  //    })
  //    browser.stderr.on('data', (data) => {
  //      console.info(`browser stderr: ${data}`)
  //    })
  //    browser.on('close', (code) => {
  //      console.log(`browser process exited with code ${code}`)
  //    })
})

