const downloadsFolder = Cypress.config('downloadsFolder');

export default {
  findDownloadedFilesByMask(mask) {
    // more about masks: https://github.com/isaacs/minimatch#usage
    return cy.task('findFiles', `${downloadsFolder}/${mask}`);
  },

  deleteFolder(pathToFolder) {
    return cy.task('deleteFolder', pathToFolder);
  },

  readFile(pathToFile) {
    return cy.readFile(pathToFile);
  }
};
