import { Button, Label, Modal, RadioButton, including, matching } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import EHolgingsStates from '../eHolgingsStates';

const exportSettingsModal = Modal({ id: 'eholdings-export-modal' });
const cancelButton = exportSettingsModal.find(Button('Cancel'));
const exportButton = exportSettingsModal.find(Button('Export'));

const mainContent =
  'This export may take several minutes to complete. When finished, it will be available in the Export manager app.';
const mainNote =
  'NOTE: Maximum number of titles in a package you can export is 10000. Filter your search within titles list to not exceed the limit or only choose to export package details only. This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.Package fields to exportAll0 items selectedContains a list of any selected values, followed by an autocomplete textfield for selecting additional values.Title fields to exportAll0 items selectedContains a list of any selected values, followed by an autocomplete textfield for selecting additional values.';
const secondaryNote =
  'NOTE: This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.';

const allPackageFieldsRadioButton = RadioButton({
  name: 'packageFields',
  ariaLabel: 'Export all fields',
});
const selectedPackageFieldsRadioButton = RadioButton({
  name: 'packageFields',
  ariaLabel: 'Export selected fields',
});
const allTitleFieldsRadioButton = RadioButton({
  name: 'titleFields',
  ariaLabel: 'Export all fields',
});
const selectedTitleFieldsRadioButton = RadioButton({
  name: 'titleFields',
  ariaLabel: 'Export selected fields',
});

export default {
  verifyModalView({ exportDisabled = false, packageView = true } = {}) {
    cy.expect([
      exportSettingsModal.has({
        header: 'Export settings',
      }),
      exportSettingsModal.has({
        message: including(`${mainContent} ${packageView ? mainNote : secondaryNote}`),
      }),
      exportSettingsModal.find(Label('Package fields to export')).exists(),
      exportSettingsModal.find(Label('Title fields to export')).exists(),
      exportSettingsModal.find(allPackageFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedPackageFieldsRadioButton).exists(),
      exportSettingsModal.find(allTitleFieldsRadioButton).exists(),
      exportSettingsModal.find(selectedTitleFieldsRadioButton).exists(),
      cancelButton.has({ disabled: false, visible: true }),
      exportButton.has({ disabled: exportDisabled, visible: true }),
    ]);
  },
  verifyExportButtonDisabled(disabled = true) {
    cy.expect(exportButton.has({ disabled }));
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
        matching(new RegExp(EHolgingsStates.exportJobStartedSuccessfully)),
      );
    }
  },
};
