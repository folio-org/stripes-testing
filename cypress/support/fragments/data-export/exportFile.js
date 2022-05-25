import { Modal, Button, Select, Pane, MultiColumnListCell } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import DataExportResults from './dataExportResults';

export default {
  uploadFile:(fileName) => {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultInstancesJobProfile:(fileName) => {
    cy.do([
      MultiColumnListCell({ content: DataExportResults.defaultJobProfile, columnIndex: 0 }).click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);
    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },

  exportWithCreatedJobProfile:(fileName, profileName) => {
    // wait for data to be loaded
    cy.intercept(
      {
        method: 'GET',
        url: '/data-export/job-profiles?*',
      }
    ).as('getProfiles');
    cy.wait('@getProfiles');
    cy.do([
      Pane({ id:'pane-results' }).find(MultiColumnListCell({ content: profileName })).click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);
    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },
};
