import { Modal, Button, Select, Pane, MultiColumnListCell } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default {
  uploadFile:(fileName) => {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultInstancesJobProfile:(fileName) => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.get('[data-row-inner="1"]').click();
    cy.do([
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);

    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },

  exportWithCreatedJobProfile:(fileName, profileName) => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.do([
      Pane({ id:'pane-results' }).find(MultiColumnListCell({ content: profileName })).click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);

    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },
};
