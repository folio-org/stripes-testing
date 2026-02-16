/* eslint-disable no-console */
const { parseGrep, shouldTestRun } = require('@cypress/grep/src/utils');
const globby = require('globby');
const fs = require('fs');
const { getTestNames } = require('find-test-names');
const { argv } = require('node:process');

let numberOfThreads = 1;
let grepTags = '';
let envVars = '';

// print process.argv
argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
  if (val.includes('tags=')) {
    grepTags = val.replace('tags=', '');
  }
  if (val.includes('threads=')) {
    numberOfThreads = Number(val.replace('threads=', ''));
  }
  if (val.includes('env=')) {
    envVars = val.replace('env=', '');
  }
});

if (grepTags === '') {
  throw new Error('No tags provided. Use tags=<tag1 tag2 ...> to specify tags to run.');
}

console.log(`\nNumber of threads: ${numberOfThreads}`);
console.log(`Environment variables: ${envVars}`);
console.log(`Tags: ${grepTags}\n`);

const parsedGrep = parseGrep(null, grepTags);

const specFiles = globby.sync('cypress/e2e/**/*.cy.js');
const testIds = [];

const chunks = [];

// if (process.env.threads) {
//   console.log('Threads from env: ' + process.env.threads);
//   numberOfThreads = Number(process.env.threads);
// }

specFiles.forEach((specFile) => {
  const text = fs.readFileSync(specFile, { encoding: 'utf8' });
  const testInfo = getTestNames(text);
  testInfo.tests.forEach((info) => {
    const shouldRun = shouldTestRun(parsedGrep, null, info.tags);
    if (shouldRun) {
      testIds.push(info.tags.filter(tag => tag.startsWith('C') || tag.startsWith('TC')));
    }
  });
});

console.log('Matched test IDs: ', testIds.flat());
console.log('Total matched tests: ', testIds.length);

if (numberOfThreads > 1) {
  const chunkSize = Math.ceil(testIds.length / numberOfThreads);
  // Loop to split array into chunks
  for (let i = 0; i < testIds.length; i += chunkSize) {
    const chunk = [];
    for (let j = i; j < i + chunkSize && j < testIds.length; j++) {
      chunk.push(testIds[j]);
    }
    chunks.push(chunk);
  }
} else {
  chunks.push(testIds);
}
const fileJson = {};
fileJson.workers = [];

console.log(`\nNumber of chunks: ${chunks.length}\n`);
chunks.forEach((chunk, index) => {
  const parsedChunk = `--env ${envVars ? envVars + ',' : ''}grepTags='${chunk.join(' ')}'`;
  fileJson.workers.push(parsedChunk);
  console.log(`Chunk #${index + 1}: `, chunk.length);
  console.log(parsedChunk + '\n');
});

fs.writeFile('parallelWorkers.json', JSON.stringify(fileJson), 'utf8', (err) => {
  if (err) {
    console.error('Error writing file', err);
  } else {
    console.log('File has been written');
  }
});


