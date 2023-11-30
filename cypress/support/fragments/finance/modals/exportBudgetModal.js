import { Button, Modal, Select, including, matching } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const exportSettingsModal = Modal('Export settings');

const fiscalYearSelect = exportSettingsModal.find(Select({ name: 'fiscalYearId' }));
const expenseClassesSelect = exportSettingsModal.find(Select({ name: 'expenseClasses' }));

const cancelButton = exportSettingsModal.find(Button('Cancel'));
const exportButton = exportSettingsModal.find(Button('Export'));

const content =
  'This export could take a few minutes. If you reload or close the page the export will not be completed. Once the file is ready it could take another minute for your browser to finish downloading the file. You can continue to work with finance records in a different browser tab if needed.';

export default {
  verifyModalView({ fiscalYear }) {
    cy.expect([
      exportSettingsModal.has({
        header: 'Export settings',
      }),
      exportSettingsModal.has({
        message: including(content),
      }),
      fiscalYearSelect.exists(),
      expenseClassesSelect.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      exportButton.has({ disabled: false, visible: true }),
    ]);

    if (fiscalYear) {
      cy.expect(fiscalYearSelect.has({ value: fiscalYear }));
    }
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(exportSettingsModal.absent());
  },
  clickExportButton({ exportStarted = true, exportCompleted = true } = {}) {
    cy.do(exportButton.click());
    cy.expect(exportSettingsModal.absent());

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(States.budgetExportStartedSuccessfully)),
      );
    }

    if (exportCompleted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(States.budgetExportCompletedSuccessfully)),
      );
    }
  },
};
