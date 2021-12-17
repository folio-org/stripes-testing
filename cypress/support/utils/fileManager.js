const downloadsFolder = Cypress.config('downloadsFolder');

export default {
  findDownloadedFilesByMask(mask) {
    // more about masks: https://github.com/isaacs/minimatch#usage
    // returns array with all files matched to mask
    return cy.task('findFiles', `${downloadsFolder}/${mask}`);
  },

  deleteFolder(pathToFolder) {
    return cy.task('deleteFolder', pathToFolder);
  },

  readFile(pathToFile) {
    return cy.readFile(pathToFile);
  },

  createFile(pathToFile, content = ' ') {
    /* passing an empty string as data because,
    cypress-file-upload` plugin doesn't allow empty files
     */
    return cy.writeFile(pathToFile, content);
  },

  deleteFile(pathToFile) {
    return cy.task('deleteFile', pathToFile);
  }
};
