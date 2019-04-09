export function finishTest (message) {
  var exitcode = 1
  if (message.match(/^pass.*/i)) exitcode = 0
  if (typeof window === 'object') {
    if (window.document) window.document.title = message
    if (window.document && window.document.body) window.document.body.innerText = message
  }
  if (typeof fetch === 'function') {
    fetch(`http://localhost:3001/test/done?code=${exitcode}&message=${encodeURIComponent(message)}`)
  } else if (process && process.exit) {
    var os = require('os')
    var chalk = require('chalk')
    if (exitcode === 0) {
      console.log(chalk.green(`(node) ${process.argv.pop().replace(os.homedir(), '')}`))
      console.log(chalk.green(`pass\t${message}`))
    } else {
      console.log(chalk.red(`(node) ${process.argv.pop().replace(os.homedir(), '')}`))
      console.log(chalk.red(`fail\t${message}`))
      process.exit(exitcode)
    }
  }
}

if (typeof window !== 'undefined') {
  // catch errors and run finishTest on them
  window.onerror = (message, source, lineno, colno, error) => {
    finishTest(`message: ${message}\nline: ${lineno}\ncol: ${colno}\nfrom: ${source}\nerror: ${error}`)
  }
} else if (typeof process !== 'undefined') {
  // TODO capture and color output?
}

export default {
  finishTest: finishTest
}