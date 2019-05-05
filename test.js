const { spawn } = require('child_process')
const path = require('path')
var test

async function runTest (p, expectfail = false, skipnode = false) {
  return new Promise(resolve => {
    var options = {
      env: {},
      detached: true
    }
    Object.assign(options.env, process.env)
    options.env.SKIPNODE = skipnode

    // Spawn the iso-test process
    try {
      test = spawn('node', [path.join(process.cwd(), 'server.node.js'), p], options)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
    test.stdout.on('data', (data) => {
      process.stdout.write(data.toString('utf8'))
    })
    test.stderr.on('data', (data) => {
      process.stderr.write(data.toString('utf8'))
    })
    test.on('exit', function (code) {
      if (code !== 0 && !expectfail) process.exit(code)
      else if (code === 0 && expectfail) {
        console.error(`fail\t${p} did not fail as expected`)
        process.exit(1)
      } else if (code !== 0 && expectfail) {
        resolve()
      } else resolve()
    })
  })
}

async function runAll () {
  await runTest(path.join(process.cwd(), 'pass.js'))
  await runTest(path.join(process.cwd(), 'fail.js'), true)
  await runTest(path.join(process.cwd(), 'fail.js'), true, true)
  await runTest(path.join(process.cwd(), 'error.js'), true)
  await runTest(path.join(process.cwd(), 'error.js'), true, true)
  console.log('All tests passed!')
}

runAll().catch(e => {
  process.exit(1)
})
