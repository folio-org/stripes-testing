import { getLongDelay } from '../../utils/cypressTools';

export default {
  goToDataImport:() => {
    cy.visit('/data-import');
  },

  uploadFile(fileName) {
    cy.get('#pane-jobs-title-content input[type=file]', getLongDelay()).attachFile(fileName);
  }
};
