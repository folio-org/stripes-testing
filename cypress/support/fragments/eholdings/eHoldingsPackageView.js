import {
  Button,
  HTML,
  Pane,
  Section,
  KeyValue,
  including,
  Modal,
  RadioButton,
  Accordion,
  MultiColumnListCell,
} from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const actionsButton = Button('Actions');
const exportButton = Button('Export package (CSV)');
const exportModal = Modal('Export settings');
const exportButtonInModal = exportModal.find(Button('Export'));
const cancelButtonInModal = exportModal.find(Button('Cancel'));
const selectedPackageFieldsRadioButton = RadioButton({
  name: 'packageFields',
  ariaLabel: 'Export selected fields',
});
const selectedTitleFieldsRadioButton = RadioButton({
  name: 'titleFields',
  ariaLabel: 'Export selected fields',
});

export default {
  close() {
    cy.do(Button({ icon: 'times' }).click());
    eHoldingsPackages.waitLoading();
  },

  waitLoading() {
    cy.expect([Section({ id: 'packageShowInformation' }).exists(), Button('Actions').exists()]);
  },

  verifyPackageName(packageName) {
    cy.expect([
      Pane({ title: packageName }).exists(),
      HTML(packageName, { className: including('headline') }).exists(),
    ]);
  },

  verifyPackageType(packageType) {
    cy.expect(KeyValue('Package type').has({ value: packageType }));
  },

  openExportModal() {
    cy.do([actionsButton.click(), exportButton.click()]);
    cy.expect(exportModal.exists());
  },

  clickExportSelectedPackageFields() {
    cy.do(selectedPackageFieldsRadioButton.click());
  },

  clickExportSelectedTitleFields() {
    cy.do(selectedTitleFieldsRadioButton.click());
  },

  verifyExportButtonInModalDisabled() {
    cy.expect(exportButtonInModal.has({ disabled: true }));
  },

  closeExportModalViaCancel() {
    cy.do(cancelButtonInModal.click());
    cy.expect(exportModal.absent());
    this.waitLoading();
  },

  createNewAgreement() {
    cy.do(Accordion({ id: 'packageShowAgreements' }).find(Button('New')).click());
  },

  verifyLinkedAgreement(agreementName) {
    cy.expect(
      Accordion('Agreements')
        .find(MultiColumnListCell({ content: agreementName }))
        .exists(),
    );
  },
};
