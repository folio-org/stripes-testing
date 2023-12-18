import {
  Button,
  Label,
  Modal,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  RadioButton,
  including,
  matching,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import OrderStates from '../orderStates';

const exportSettingsModal = Modal('Export settings');
const cancelButton = exportSettingsModal.find(Button('Cancel'));
const exportButton = exportSettingsModal.find(Button('Export'));

const content =
  'This export could take a few minutes. If you reload or close the page the export will not be completed. Once the file is ready it could take another minute for your browser to finish downloading the file. You can continue to work with orders and order lines in a different browser tab if needed.';

const allOrderFieldsRadioButton = RadioButton({
  name: 'orderExport',
  ariaLabel: 'Export all order fields',
});
const selectedOrderFieldsRadioButton = RadioButton({
  name: 'orderExport',
  ariaLabel: 'Export selected order fields',
});
const allOrderLineFieldsRadioButton = RadioButton({
  name: 'lineExport',
  ariaLabel: 'Export all line fields',
});
const selectedOrderLineFieldsRadioButton = RadioButton({
  name: 'lineExport',
  ariaLabel: 'Export selected line fields',
});

export default {
  verifyModalView() {
    cy.expect([
      exportSettingsModal.has({
        header: 'Export settings',
      }),
      exportSettingsModal.has({
        message: including(content),
      }),
      exportSettingsModal.find(Label('PO fields to export')).exists(),
      exportSettingsModal.find(Label('POL fields to export')).exists(),
      exportSettingsModal.find(allOrderFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedOrderFieldsRadioButton).exists(),
      exportSettingsModal.find(allOrderLineFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedOrderLineFieldsRadioButton).exists(),
      cancelButton.has({ disabled: false, visible: true }),
      exportButton.has({ disabled: false, visible: true }),
    ]);
  },
  selectOrderFieldsToExport(option) {
    cy.do([
      selectedOrderFieldsRadioButton.click(),
      MultiSelect({ ariaLabelledby: 'selected-po-fields' }).toggle(),
      MultiSelectMenu().find(MultiSelectOption(option)).click(),
    ]);
  },
  selectOrderLineFieldsToExport(option) {
    cy.do([
      selectedOrderLineFieldsRadioButton.click(),
      MultiSelect({ ariaLabelledby: 'selected-pol-fields' }).toggle(),
      MultiSelectMenu().find(MultiSelectOption(option)).click(),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(exportSettingsModal.absent());
  },
  clickExportButton({ exportStarted = true } = {}) {
    cy.do(exportButton.click());
    cy.expect(exportSettingsModal.absent());

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.exportJobStartedSuccessfully)),
      );
    }
  },
};
