const path = require('path');
const projectRoot = __dirname;
console.log('__dirname:', projectRoot);
console.log('normalize:', path.normalize(projectRoot));
console.log('resolve:', path.resolve(projectRoot));
