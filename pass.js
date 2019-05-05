import global from '../global/global.js'
import { Process } from '../process/process.js'
import { finishTest } from './index.js'
global.process = Process.getProcess()

if (typeof (global.process.options.env) !== 'undefined') finishTest('pass process env available for global')
else finishTest('fail no test env found')

finishTest('kill')
