import { Button, HTML } from '@interactors/html';
import FileManager from '../../utils/fileManager';
import { Modal } from '../../../../interactors';

export default {
  openStartBulkEditForm() {
    cy.do(Button('Start bulk edit (CSV)').click());
  },

  verifyLabel(text) {
    cy.expect(HTML(text).exists());
  },

  downloadMatchedResults(fileName = 'matchedRecords.csv') {
    cy.do(Button('Actions').click());
    // It is necessary to avoid cypress reload page expecting
    cy.get('a[download]', { timeout: 15000 }).first().then(($input) => {
      cy.downloadFile($input.attr('href'), 'cypress/downloads', fileName);
    });
  },

  prepareBulkEditFileForImport(fileMask, finalFileName, stringToBeReplaced, replaceString) {
    FileManager.findDownloadedFilesByMask(`*${fileMask}*`).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

      FileManager.readFile(lastDownloadedFilename)
        .then((actualContent) => {
          const content = actualContent.split('\n');
          content[2] = content[1].slice().replace(stringToBeReplaced, replaceString);
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
    });
  },

  commitChanges() {
    cy.do([
      Modal().find(Button('Next')).click(),
      Modal().find(Button('Commit changes')).click()
    ]);
  },

  newBulkEdit() {
    cy.do(Button('New bulk edit').click());
  }
};
