/* eslint-disable no-console */
const { argv } = require('node:process');
const { splitTestsOnChunks } = require('./split-tests-on-chunks');

let numberOfThreadsArg = 1;
let grepTagsArg = '';
let envVarsArg = '';
let useOriginalTags = false;

// print process.argv
argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
  if (val.startsWith('threads=')) {
    numberOfThreadsArg = Number(val.replace('threads=', ''));
  } else if (val.startsWith('tags=')) {
    grepTagsArg = val.replace('tags=', '');
  } else if (val.startsWith('env=')) {
    envVarsArg = val.replace('env=', '');
  } else if (val.toLowerCase() === 'useOriginalTags'.toLowerCase()) {
    console.log('useOriginalTags flag detected, passing tags as is, without splitting into chunks.');
    useOriginalTags = true;
  }
});

if (grepTagsArg === '') {
  throw new Error('No tags provided. Use tags=<tag1 tag2 ...> to specify tags to run.');
}

console.log(`\nNumber of threads: ${numberOfThreadsArg}`);
console.log(`Environment variables: ${envVarsArg}`);
console.log(`Tags: ${grepTagsArg}`);
console.log(`Use original tags: ${useOriginalTags}\n`);

splitTestsOnChunks(numberOfThreadsArg, grepTagsArg, envVarsArg, false, useOriginalTags);
