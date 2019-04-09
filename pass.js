import { finishTest } from './index.js'
try {
  finishTest('pass with message')
} catch (e) {
  console.trace(e)
  finishTest(e.stack)
}
