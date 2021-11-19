const globby = require('globby');
const { rmdir } = require('fs');

// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  on('task', {
    // a task to find one file matching the given mask
    // returns just the first matching file
    async findFiles(mask) {
      if (!mask) {
        throw new Error('Missing a file mask to search');
      }

      const list = await globby(mask);

      if (!list.length) {
        return null;
      }

      return list[0];
    },

    deleteFolder(folderName) {
      console.log('deleting folder %s', folderName);

      return new Promise((resolve, reject) => {
        rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error(err);

            return reject(err);
          }

          resolve(null);
        });
      });
    }
  });
};
