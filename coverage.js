const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function ensureDirectoryExistence(filePath) {
// This will create a dir given a path such as './folder/subfolder'
  const splitPath = filePath.split('/');
  splitPath.reduce((fullpath, subPath) => {
    let currentPath;
    if (subPath !== '.') {
      currentPath = fullpath + '/' + subPath;
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
    } else {
      currentPath = subPath;
    }
    return currentPath;
  }, '');
}
function removeDirectoryContents(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    fs.unlinkSync(path.join(directory, file));
  }
}
module.exports.prepareCoverage = function prepareCoverage(dirname) {
  new Promise((resolve) => {
    ensureDirectoryExistence(dirname);
    resolve(true);
  }).then((result) => {
    removeDirectoryContents(dirname);
    return result;
  });
};
module.exports.doCoverage = function coverage(nightmare, dirname) {
  nightmare
    .evaluate(() => window.__coverage__)
    .then((cov) => {
      // this executes in Node scope
      // handle the data passed back to us from browser scope
      const strCoverage = JSON.stringify(cov);
      if (strCoverage != null) {
        const hash = crypto.createHash('sha256')
          .update(strCoverage)
          .digest('hex');
        const fileName = dirname + 'coverage-' + hash + '.json';
        fs.writeFileSync(fileName, strCoverage);
      }
    })
    .catch(err => console.log(err));
};
