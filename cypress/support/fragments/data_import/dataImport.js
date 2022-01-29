import { getLongDelay } from '../../utils/cypressTools';

export default {
  goToDataImport:() => {
    cy.visit('/data-import');
  },

  uploadFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: 'oneMarcBib.mrc', fileName });
  },

  uploadFileWithout999Field(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: 'oneMarcBibWithout999Field.mrc', fileName });
  },

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  }
};
