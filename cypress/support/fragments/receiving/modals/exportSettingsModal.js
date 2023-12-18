import {
  Button,
  Label,
  Modal,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  RadioButton,
  including,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import ReceivingStates from '../receivingStates';

const exportSettingsModal = Modal('Export settings');
const cancelButton = exportSettingsModal.find(Button('Cancel'));
const exportButton = exportSettingsModal.find(Button('Export'));

const content =
  'This export could take a few minutes. If you reload or close the page the export will not be completed. Once the file is ready it could take another minute for your browser to finish downloading the file. You can continue to work with titles and pieces in a different browser tab if needed.';

const allTitleFieldsRadioButton = RadioButton({
  name: 'exportTitleFields',
  ariaLabel: 'Export all title fields',
});
const selectedTitleFieldsRadioButton = RadioButton({
  name: 'exportTitleFields',
  ariaLabel: 'Export selected title fields',
});
const allPieceFieldsRadioButton = RadioButton({
  name: 'exportPieceFields',
  ariaLabel: 'Export all piece fields',
});
const selectedPieceFieldsRadioButton = RadioButton({
  name: 'exportPieceFields',
  ariaLabel: 'Export selected piece fields',
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
      exportSettingsModal.find(Label('Title fields')).exists(),
      exportSettingsModal.find(Label('Piece fields')).exists(),
      exportSettingsModal.find(allTitleFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedTitleFieldsRadioButton).exists(),
      exportSettingsModal.find(allPieceFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedPieceFieldsRadioButton).exists(),
      cancelButton.has({ disabled: false, visible: true }),
      exportButton.has({ disabled: false, visible: true }),
    ]);
  },
  selectTitleFieldsToExport(options = []) {
    cy.do([
      selectedTitleFieldsRadioButton.click(),
      MultiSelect({ ariaLabelledby: 'selected-title-fields' }).toggle(),
    ]);

    options.forEach((option) => {
      cy.do(MultiSelectMenu().find(MultiSelectOption(option)).click());
    });
  },
  selectPieceFieldsToExport(options = []) {
    cy.do([
      selectedPieceFieldsRadioButton.click(),
      MultiSelect({ ariaLabelledby: 'selected-piece-fields' }).toggle(),
    ]);

    options.forEach((option) => {
      cy.do(MultiSelectMenu().find(MultiSelectOption(option)).click());
    });
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(exportSettingsModal.absent());
  },
  clickExportButton({ exportStarted = true } = {}) {
    cy.do(exportButton.click());
    cy.expect(exportSettingsModal.absent());

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(ReceivingStates.exportJobStartedSuccessfully);
    }
  },
};
