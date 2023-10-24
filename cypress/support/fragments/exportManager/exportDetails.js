import { KeyValue, Pane, including } from '../../../../interactors';

const exportDetailsPane = Pane('Export job ');

export default {
  waitLoading() {
    cy.expect([exportDetailsPane.exists()]);
  },
  checkExportJobDetails({ exportInformation = [] } = {}) {
    exportInformation.forEach(({ key, value }) => {
      cy.expect(exportDetailsPane.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
};
