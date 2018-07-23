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
  fs.readdirSync(directory, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      console.log('removing file ' + path.join(directory, file));
      fs.unlinkSync(path.join(directory, file), error => {
        if (error) throw error;
      });
    }
  });
}
module.exports.doCoverage = function coverage(nightmare) {
  nightmare
    .evaluate(() => window.__coverage__)
    .end()
    .then((cov) => {
      // this executes in Node scope
      // handle the data passed back to us from browser scope
      const strCoverage = JSON.stringify(cov);
      if (strCoverage != null) {
        const hash = crypto.createHmac('sha256', '')
          .update(strCoverage)
          .digest('hex');
        const dirname = './artifacts/coveragetemp/';
        const fileName = dirname + 'coverage-' + hash + '.json';
        new Promise((resolve) => {
          ensureDirectoryExistence(dirname);
          resolve(true);
        }).then((result) => {
          removeDirectoryContents(dirname);
          return result;
        }).then((result) => {
          console.log('writing new file' + fileName);
          fs.writeFileSync(fileName, strCoverage);
          return result;
        });
      }
    })
    .catch(err => console.log(err));
};
