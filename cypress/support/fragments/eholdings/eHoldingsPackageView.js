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
  Label,
  MultiSelect,
  Callout,
  TextField,
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
const getCalloutMessageText = () => cy.then(() => Callout({ type: 'success' }).textContent());
const addAgreementButton = Button({ id: 'find-agreement-trigger' });
const findAgreementModal = Modal({ id: 'plugin-find-agreement-modal' });
const agreementSearchInputField = findAgreementModal.find(TextField({ id: 'input-agreement-search' }));
const searchAgreementButton = findAgreementModal.find(Button({ id: 'clickable-search-agreements' }));

export default {
  getCalloutMessageText,
  close() {
    cy.do(Button({ icon: 'times' }).click());
    eHoldingsPackages.waitLoading();
  },

  waitLoading() {
    cy.expect([Section({ id: 'packageShowInformation' }).exists(), Button('Actions').exists()]);
  },

  openExportModal() {
    cy.do([actionsButton.click(), exportButton.click()]);
    cy.expect(exportModal.exists());
  },

  clickExportSelectedPackageFields() {
    cy.do(selectedPackageFieldsRadioButton.click());
  },

  selectPackageFieldsToExport: (value) => {
    cy.do(MultiSelect({ ariaLabelledby: 'selected-package-fields' }).select(value));
  },

  clickExportSelectedTitleFields() {
    cy.do(selectedTitleFieldsRadioButton.click());
  },

  closeExportModalViaCancel() {
    cy.do(cancelButtonInModal.click());
    cy.expect(exportModal.absent());
    this.waitLoading();
  },

  createNewAgreement() {
    cy.do(Accordion({ id: 'packageShowAgreements' }).find(Button('New')).click());
  },

  addExistingAgreement() {
    cy.do(addAgreementButton.click());
  },

  searchForExistingAgreement(agreementName) {
    cy.expect(findAgreementModal.exists());
    cy.do([
      agreementSearchInputField.fillIn(agreementName),
      searchAgreementButton.click(),
    ]);
  },

  clickOnFoundAgreementInModal(agreementName) {
    cy.do(findAgreementModal.find(MultiColumnListCell(agreementName)).click());
  },

  clickOnAgreementInAgreementSection(agreementName) {
    cy.do(
      Accordion('Agreements')
        .find(MultiColumnListCell({ content: agreementName }))
        .click(),
    );
  },

  export() {
    cy.do(exportButtonInModal.click());
  },

  verifyExportButtonInModalDisabled() {
    cy.expect(exportButtonInModal.has({ disabled: true }));
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

  verifyLinkedAgreement(agreementName) {
    cy.expect(
      Accordion('Agreements')
        .find(MultiColumnListCell({ content: agreementName }))
        .exists(),
    );
  },

  verifyPackageDetailViewIsOpened: (name, titlesNumber, status) => {
    cy.expect([
      Pane(name).exists(),
      Accordion({ id: 'packageShowTitles' })
        .find(KeyValue('Records found'))
        .has({ value: titlesNumber }),
      Accordion('Holding status').has({ content: including(status) }),
    ]);
  },

  verifyExportModal: () => {
    const modalContent =
      'This export may take several minutes to complete. When finished, it will be available in the Export manager app. NOTE: Maximum number of titles in a package you can export is 10000. Filter your search within titles list to not exceed the limit or only choose to export package details only. This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.';

    cy.expect(exportModal.find(HTML(including(modalContent))).exists());
    cy.expect(exportModal.find(Label('Package fields to export')).exists());
    cy.expect(exportModal.find(Label('Title fields to export')).exists());
    cy.expect(exportModal.find(selectedPackageFieldsRadioButton).exists());
    cy.expect(exportModal.find(selectedTitleFieldsRadioButton).exists());
    cy.expect(cancelButtonInModal.has({ disabled: false }));
    cy.expect(exportButtonInModal.has({ disabled: false }));
  },

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  getJobIDFromCalloutMessage: () => {
    const regex = /(\d+)/;

    return getCalloutMessageText().then((text) => {
      const match = text.match(regex);
      const jobId = match ? match[0] : null;
      return jobId;
    });
  },
};
