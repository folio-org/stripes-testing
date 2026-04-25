/* eslint-disable no-console */
const { argv } = require('node:process');
const { splitTestsOnChunks } = require('./split-tests-on-chunks');

let numberOfThreadsArg = 1;
let grepTagsArg = '';
let envVarsArg = '';

// print process.argv
argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
  if (val.includes('threads=')) {
    numberOfThreadsArg = Number(val.replace('threads=', ''));
  }
  if (val.includes('tags=')) {
    grepTagsArg = val.replace('tags=', '');
  }
  if (val.includes('env=')) {
    envVarsArg = val.replace('env=', '');
  }
});

if (grepTagsArg === '') {
  throw new Error('No tags provided. Use tags=<tag1 tag2 ...> to specify tags to run.');
}

console.log(`\nNumber of threads: ${numberOfThreadsArg}`);
console.log(`Environment variables: ${envVarsArg}`);
console.log(`Tags: ${grepTagsArg}\n`);


splitTestsOnChunks(numberOfThreadsArg, grepTagsArg, envVarsArg);
