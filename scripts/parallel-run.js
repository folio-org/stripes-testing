/* eslint-disable no-console */
const { parseGrep, shouldTestRun } = require('@cypress/grep/src/utils');
const globby = require('globby');
const fs = require('fs');
const { getTestNames } = require('find-test-names');

const grepTags = 'testSmoke';

const parsedGrep = parseGrep(null, grepTags);

const specFiles = globby.sync('cypress/e2e/**/*.cy.js');
const testIds = [];

let numberOfThreads = 3;
const chunks = [];

if (process.env.threads) {
  console.log('Threads from env: ' + process.env.threads);
  numberOfThreads = Number(process.env.threads);
}

specFiles.forEach((specFile) => {
  const text = fs.readFileSync(specFile, { encoding: 'utf8' });
  const testInfo = getTestNames(text);
  testInfo.tests.forEach((info) => {
    const shouldRun = shouldTestRun(parsedGrep, null, info.tags);
    if (shouldRun) {
      testIds.push(info.tags.filter(tag => tag.startsWith('C')));
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
}
const fileJson = {};
fileJson.workers = [];

console.log(`Number of chunks: ${chunks.length}\n`);
chunks.forEach((chunk, index) => {
  const parsedChunk = `--env grepTags='${chunk.join(' ')}'`;
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


