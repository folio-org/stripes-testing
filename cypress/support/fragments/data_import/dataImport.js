import { getLongDelay } from '../../utils/cypressTools';
import { Button } from '../../../../interactors';

export default {
  goToDataImport:() => {
    cy.visit('/data-import');
  },

  uploadFile() {
    cy.get('#pane-jobs-title-content input[type=file]', getLongDelay()).attachFile('oneMarcBib.mrc');
  }
};
