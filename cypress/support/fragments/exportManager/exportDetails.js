import { Button, KeyValue, Pane, including } from '../../../../interactors';
import { EXPORT_MANAGER_EDI_JOB_FIELD_LABELS } from '../../constants';

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
  verifyJobLabels(labels = Object.values(EXPORT_MANAGER_EDI_JOB_FIELD_LABELS)) {
    labels.forEach((label) => {
      cy.expect(KeyValue(label).exists());
    });
  },
  closeJobDetails() {
    cy.do(exportDetailsPane.find(Button({ icon: 'times' })).click());
  },
};
