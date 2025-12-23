import { recurse } from 'cypress-recurse';

const downloadsFolder = Cypress.config('downloadsFolder');

export default {
  findDownloadedFilesByMask(mask) {
    /*
    more about masks: https://github.com/isaacs/minimatch#usage
    returns array with all files matched to mask
    */
    return cy.task('findFiles', `cypress/downloads/${mask}`);
  },

  deleteFolder(pathToFolder) {
    return cy.task('deleteFolder', pathToFolder);
  },

  readFile(pathToFile) {
    return cy.readFile(pathToFile);
  },

  createFile(pathToFile, content = ' ') {
    // default value for content is a string with an empty space character
    // because, cypress-file-upload plugin doesn't allow empty files

    return cy.writeFile(pathToFile, content);
  },

  appendFile(pathToFile, content) {
    return cy.writeFile(pathToFile, content, { flag: 'a+' });
  },

  deleteFile(pathToFile) {
    return cy.task('deleteFile', pathToFile);
  },

  deleteFileFromDownloadsByMask(...fileNameMasks) {
    fileNameMasks.forEach((fileNameMask) => {
      this.findDownloadedFilesByMask(fileNameMask).then((fileName) => {
        if (fileName !== null) {
          cy.task('deleteFile', fileName[0]);
        } else {
          cy.log(`NO FILE FOUND FOR MASK: ${fileNameMask}`);
        }
      });
    });
  },

  deleteFilesFromDownloadsByMask(...fileNameMasks) {
    fileNameMasks.forEach((fileNameMask) => {
      this.findDownloadedFilesByMask(fileNameMask).then((fileNames) => {
        fileNames?.forEach((fileName) => cy.task('deleteFile', fileName));
      });
    });
  },

  convertCsvToJson(readFileName) {
    cy.wait(Cypress.env('downloadTimeout'));

    this.findDownloadedFilesByMask(readFileName).then((downloadedFileNames) => {
      const lastDownloadedFileName = downloadedFileNames.sort()[downloadedFileNames.length - 1];

      this.readFile(lastDownloadedFileName).then((content) => {
        cy.task('convertCsvToJson', content).then((data) => {
          cy.wrap(data).as('jsonData');
        });
      });
    });

    return cy.get('@jsonData');
  },

  writeToSeparateFile({ readFileName, writeFileName, lines = [] } = {}) {
    cy.wait(Cypress.env('downloadTimeout'));

    this.findDownloadedFilesByMask(readFileName).then((downloadedFileNames) => {
      const lastDownloadedFileName = downloadedFileNames.sort()[downloadedFileNames.length - 1];

      this.readFile(lastDownloadedFileName).then((content) => {
        this.createFile(
          `cypress/downloads/${writeFileName}`,
          content
            .split('\n')
            .slice(...lines)
            .join('\n'),
        );
      });
    });
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

    this.findDownloadedFilesByMask(fileNameMask).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];
      verifyNameFunc(lastDownloadedFilename);

      this.readFile(lastDownloadedFilename).then((actualContent) => {
        verifyContentFunc(actualContent, ...verifyContentFuncArgs);
      });
    });
  },

  verifyFileIncludes(fileName, content, present = true) {
    cy.wait(Cypress.env('downloadTimeout'));

    recurse(
      () => this.findDownloadedFilesByMask(fileName),
      (x) => typeof x === 'object' && !!x,
    ).then((foundFiles) => {
      const lastDownloadedFilename = foundFiles.sort()[foundFiles.length - 1];

      this.readFile(lastDownloadedFilename).then((actualContent) => {
        content.forEach((element) => {
          if (present) {
            expect(actualContent).to.include(element);
          } else {
            expect(actualContent).to.not.include(element);
          }
        });
      });
    });
  },

  getFileNameFromFilePath(path) {
    const fullPathToFile = path.split('/');
    return fullPathToFile[fullPathToFile.length - 1];
  },

  verifyFilesHaveEqualContent(firstFilePath, secondFilePath, encoding = 'binary') {
    /*
    Compares content of two files and verifies they are equal
    firstFilePath: path to first file
    secondFilePath: path to second file
    encoding: file encoding (default: 'binary'). Use 'binary' for .mrc files, 'utf8' for text files
    */
    return cy.readFile(firstFilePath, encoding).then((firstFileContent) => {
      cy.readFile(secondFilePath, encoding).then((secondFileContent) => {
        expect(firstFileContent).to.equal(secondFileContent);
      });
    });
  },

  renameFile(fileNameMask, fileName) {
    /*
    verifyNameFunc: function for verifying file name
    fileMask: mask for searching file in downloads folder
    */
    // Need time for download file TODO: think about how it can be fixed
    cy.wait(Cypress.env('downloadTimeout'));

    return this.findDownloadedFilesByMask(fileNameMask).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

      this.readFile(lastDownloadedFilename).then((actualContent) => {
        return this.createFile(`${downloadsFolder}/${fileName}`, actualContent).then(() => this.deleteFile(lastDownloadedFilename));
      });
    });
  },
};
