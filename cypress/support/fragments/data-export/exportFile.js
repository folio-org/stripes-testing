import { MultiColumnListCell, Modal, Button, Select, including } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default {
  uploadFile:(fileName) => {
    cy.get('#data-export-module-display input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultInstancesJobProfile:(fileName) => {
    // TODO by interactors and stabilize it
    // cy.do(MultiColumnListCell({ row: 1, columnIndex: 2 }).click());
    cy.wait(2000);
    cy.get('[class*="mclRowContainer-"] [data-row-inner="1"]').click();
    cy.do([
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
      MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button({ text: including(fileName) })).click()
    ]);
  },
};
