import * as fs from 'fs'
import * as open from '../open/index.js'
import * as os from 'os'
import * as path from 'path'
import global from '../always-global/global.js'
import { Process } from '../iso-process/process.js'
import * as kill from '../tree-kill/index.js'
import '../dotenv/config.js'

global.process = Process.getProcess()
var tempdir
var browser

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

export function killBrowser (code) {
  /*
   * Kill the browser process which was started to run the test.
   * When done, also kill this test server process.
   */
  kill.default(browser.pid, 'SIGKILL', function (err) {
    if (err) console.error(err)
    if (tempdir) rimrafSync(tempdir)
    process.exit(code)
  })
}

export async function openBrowser (testurl) {
  // Sense browser and arguments from environment variables.
  var args = []
  process.env.BROWSER = process.env.BROWSER || 'chromium-browser'
  if (process.env.BROWSER.indexOf('chromium') > -1) {
    if (process.platform === 'win32') args.push('chromium')
    else if (process.platform === 'darwin') args.push('Chromium')
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
  browser = await open.default(testurl, { app: args }).catch(e => {
    process.stderr.write(e)
    process.exit(1)
  })
  setTimeout(() => {
    process.stderr.write(`(browser)\tfail\ttest timeout
`)
    killBrowser(1)
  }, parseInt(process.env.TEST_TIMEOUT))
}
