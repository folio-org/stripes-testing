const downloadsFolder = Cypress.config('downloadsFolder');

export default {
  findDownloadedFilesByMask(mask) {
    /*
    more about masks: https://github.com/isaacs/minimatch#usage
    returns array with all files matched to mask
    */

    return cy.task('findFiles', `${downloadsFolder}/${mask}`);
  },

  deleteFolder(pathToFolder) {
    return cy.task('deleteFolder', pathToFolder);
  },

  readFile(pathToFile) {
    return cy.readFile(pathToFile);
  },

  createFile(pathToFile) {
    /*
    passing an empty string as data because,
    cypress-file-upload plugin doesn't allow empty files
    */

    return cy.writeFile(pathToFile, ' ');
  },

  deleteFile(pathToFile) {
    return cy.task('deleteFile', pathToFile);
  },

  verifyFile(verifyNameFunc, fileNameMask, verifyContentFunc, verifyContentFuncArgs = []) {
    /*
    verifyNameFunc: function for verifying file name
    verifyContentFunc: function for verifying file content
    fileMask: mask for searching file in downloads folder
    verifyContentFuncArgs: array. Arguments for verify content function if needed
    */

    // Need time for download file TODO: think about how it can be fixed
    cy.wait(Cypress.env('downloadTimeout'));

    this.findDownloadedFilesByMask(fileNameMask)
      .then((downloadedFilenames) => {
        const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];
        verifyNameFunc(lastDownloadedFilename);

        this.readFile(lastDownloadedFilename)
          .then((actualContent) => {
            verifyContentFunc(actualContent, ...verifyContentFuncArgs);
          });
      });
  }
};
