import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { killBrowser } from './util.js'

// Route called by finishTest. Prints test results and initializes cleanup.
export function finishTestHandler (req, res) {
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
export function testPageHandler (req, res, testscript, toload) {
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

// Serve static files
export async function filehandler (req, res, root) {
  // forbid dotfiles in root
  if (req.pathname.startsWith('/.')) {
    res.writeHead(401)
    res.end('Forbidden')
  } else {
    // send the file
    // Support guld scoped path
    var fp = path.join(root, req.pathname)
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
