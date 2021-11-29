const globby = require('globby');
const { rmdir } = require('fs');

module.exports = (on, config) => {
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
        rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
          if (err && err.code !== 'ENOENT') {
            return reject(err);
          }

          resolve(null);
        });
      });
    }
  });
};
