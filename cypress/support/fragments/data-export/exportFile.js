import { Modal, Button, Select, MultiColumnListCell } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import DataExportResults from './dataExportResults';

export default {
  uploadFile:(fileName) => {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  exportWithDefaultInstancesJobProfile:(fileName) => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.do([
      MultiColumnListCell({ content: DataExportResults.defaultJobProfile, columnIndex: 0 }).click(),
      Modal({ id: 'choose-job-profile-confirmation-modal' }).find(Select()).choose('Instances'),
      Button('Run').click(),
    ]);

    cy.get('#job-logs-list').contains(fileName.replace('.csv', ''));
  },
};
