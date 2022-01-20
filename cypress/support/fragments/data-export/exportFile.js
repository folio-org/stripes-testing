import { Modal, Button, Select } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default {
  uploadFile:(fileName) => {
    cy.get('#data-export-module-display input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultInstancesJobProfile:() => {
    // TODO by interactors and stabilize it
    // cy.do(MultiColumnListCell({ row: 1, columnIndex: 2 }).click());
    cy.wait(2000);
    cy.get('[class*="mclRowContainer-"] [data-row-inner="1"]').click();
    cy.do([
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);
  },
};
