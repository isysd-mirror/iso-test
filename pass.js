import { finishTest } from './index.js'
if (typeof(window) !== 'undefined' && typeof(window.sysenv) === 'undefined') finishTest('pass sysenv available for window')
else finishTest('pass from node')
finishTest('kill')
