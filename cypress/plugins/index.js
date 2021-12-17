const globby = require('globby');
const { rmdir, unlink } = require('fs');
const cypressGrep = require('cypress-grep/src/plugin');

// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  cypressGrep(config);

  on('task', {
    // a task to find files matching the given mask
    async findFiles(mask) {
      if (!mask) {
        throw new Error('Missing a file mask to search');
      }

      const list = await globby(mask);

      if (!list.length) {
        return null;
      }

      return list;
    },

    deleteFolder(folderName) {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line consistent-return
        rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
          if (err && err.code !== 'ENOENT') {
            return reject(err);
          }

          resolve(null);
        });
      });
    },

    deleteFile(pathToFile) {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line consistent-return
        unlink(pathToFile, (err) => {
          if (err && err.code !== 'ENOENT') {
            return reject(err);
          }

          resolve(null);
        });
      });
    }
  });

  return config;
};
