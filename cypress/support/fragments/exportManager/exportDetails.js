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
};
