import { Button, KeyValue, Pane, including } from '../../../../interactors';

const exportDetailsPane = Pane('Export job ');
const actionsButton = exportDetailsPane.find(Button('Actions'));

export default {
  waitLoading() {
    cy.expect([exportDetailsPane.exists()]);
  },
  checkExportJobDetails({ exportInformation = [] } = {}) {
    exportInformation.forEach(({ key, value }) => {
      cy.expect(exportDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  downloadExportFile() {
    cy.do([actionsButton.click(), Button('Download').click()]);
  },
  verifyJobLabels() {
    const labels = [
      'Job ID',
      'Status',
      'Start time',
      'End time',
      'Source',
      'Organization',
      'Export method',
      'Sent to',
      'File name',
      'Description',
      'Error details',
    ];
    labels.forEach((label) => {
      cy.expect(KeyValue(label).exists());
    });
  },
};
