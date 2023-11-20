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
  MultiSelectOption,
  Callout,
  TextField,
  matching,
  FieldSet,
} from '../../../../interactors';
import EHoldingsPackages from './eHoldingsPackages';
import EHolgingsStates from './eHolgingsStates';
import InteractorsTools from '../../utils/interactorsTools';

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
const allPackageFieldsRadioButton = RadioButton({
  name: 'packageFields',
  ariaLabel: 'Export all fields',
});
const allTitleFieldsRadioButton = RadioButton({
  name: 'titleFields',
  ariaLabel: 'Export all fields',
});
const getCalloutMessageText = () => cy.then(() => Callout({ type: 'success' }).textContent());
const addAgreementButton = Button({ id: 'find-agreement-trigger' });
const findAgreementModal = Modal({ id: 'plugin-find-agreement-modal' });
const agreementSearchInputField = findAgreementModal.find(
  TextField({ id: 'input-agreement-search' }),
);
const searchAgreementButton = findAgreementModal.find(
  Button({ id: 'clickable-search-agreements' }),
);
const titleFieldsSelect = MultiSelect({ ariaLabelledby: 'selected-title-fields' });
const packageFieldsSelect = MultiSelect({ ariaLabelledby: 'selected-package-fields' });
const openDropdownMenu = Button({ ariaLabel: 'open menu' });
const patronRadioButton = FieldSet('Show titles in package to patrons');

export default {
  getCalloutMessageText,
  close() {
    cy.do(Button({ icon: 'times' }).click());
    EHoldingsPackages.waitLoading();
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
    cy.do(packageFieldsSelect.select(value));
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
    cy.do([agreementSearchInputField.fillIn(agreementName), searchAgreementButton.click()]);
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

  export({ exportStarted = true } = {}) {
    cy.expect(exportButtonInModal.has({ disabled: false }));
    cy.do(exportButtonInModal.click());

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(EHolgingsStates.exportJobStartedSuccessfully)),
      );
    }
  },

  verifyExportButtonInModalDisabled(isDisabled = true) {
    cy.expect(exportButtonInModal.has({ disabled: isDisabled }));
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

  verifyDetailViewPage(name, status) {
    cy.expect([
      Pane(name).exists(),
      Accordion('Holding status').has({ content: including(status) }),
    ]);
  },

  verifyExportModal: (exportDisabled = false) => {
    const modalContent =
      'This export may take several minutes to complete. When finished, it will be available in the Export manager app. NOTE: Maximum number of titles in a package you can export is 10000. Filter your search within titles list to not exceed the limit or only choose to export package details only. This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.';

    cy.expect(exportModal.find(HTML(including(modalContent))).exists());
    cy.expect(exportModal.find(Label('Package fields to export')).exists());
    cy.expect(exportModal.find(Label('Title fields to export')).exists());
    cy.expect(exportModal.find(selectedPackageFieldsRadioButton).exists());
    cy.expect(exportModal.find(selectedTitleFieldsRadioButton).exists());
    cy.expect(cancelButtonInModal.has({ disabled: false }));
    cy.expect(exportButtonInModal.has({ disabled: exportDisabled }));
  },

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  getTotalTitlesCount() {
    return cy
      .then(() => KeyValue('Total titles').value())
      .then((count) => parseFloat(count.replace(/,/g, '')));
  },

  getJobIDFromCalloutMessage: () => {
    const regex = /(\d+)/;

    return getCalloutMessageText().then((text) => {
      const match = text.match(regex);
      const jobId = match ? match[0] : null;
      return jobId;
    });
  },

  selectTitleFieldsToExport: (value) => {
    cy.do(titleFieldsSelect.select(value));
  },

  verifySelectedTitleFieldsToExport(titleFieldsArray) {
    cy.expect(titleFieldsSelect.has({ selected: titleFieldsArray }));
  },

  verifySelectedPackageFieldsToExport(packageFieldsArray) {
    cy.expect(packageFieldsSelect.has({ selected: packageFieldsArray }));
  },

  closePackageFieldOption(option) {
    cy.do(
      packageFieldsSelect
        .find(Button({ icon: 'times', ariaLabelledby: including(option) }))
        .click(),
    );
  },

  closeTitleFieldOption(option) {
    cy.do(
      titleFieldsSelect.find(Button({ icon: 'times', ariaLabelledby: including(option) })).click(),
    );
  },

  fillInPackageFieldsToExport: (value) => {
    cy.do([packageFieldsSelect.fillIn(value), MultiSelectOption(including(value)).click()]);
  },

  fillInTitleFieldsToExport: (value) => {
    cy.do([titleFieldsSelect.fillIn(value), MultiSelectOption(including(value)).click()]);
  },

  verifySelectedPackageFieldsOptions() {
    cy.do(packageFieldsSelect.find(openDropdownMenu).click());
    cy.expect([
      MultiSelectOption(including('Access Status Type')).exists(),
      MultiSelectOption(including('Agreements')).exists(),
      MultiSelectOption(including('Automatically Select titles')).exists(),
      MultiSelectOption(including('Custom Coverage')).exists(),
      MultiSelectOption(including('Holdings status')).exists(),
      MultiSelectOption(including('Notes')).exists(),
      MultiSelectOption(including('Package Content Type')).exists(),
      MultiSelectOption(including('Package Id')).exists(),
      MultiSelectOption(including('Package Level Token')).exists(),
      MultiSelectOption(including('Package Name')).exists(),
      MultiSelectOption(including('Package Type')).exists(),
      MultiSelectOption(including('Provider Id')).exists(),
      MultiSelectOption(including('Provider Level Token')).exists(),
      MultiSelectOption(including('Provider Name')).exists(),
      MultiSelectOption(including('Proxy')).exists(),
      MultiSelectOption(including('Show To Patrons')).exists(),
      MultiSelectOption(including('Tags')).exists(),
    ]);
  },

  verifySelectedTitleFieldsOptions() {
    cy.do(titleFieldsSelect.find(openDropdownMenu).click());
    cy.expect([
      MultiSelectOption(including('Access status type')).exists(),
      MultiSelectOption(including('Agreements')).exists(),
      MultiSelectOption(including('Alternate title(s)')).exists(),
      MultiSelectOption(including('Contributors')).exists(),
      MultiSelectOption(including('Coverage statement')).exists(),
      MultiSelectOption(including('Custom coverage dates')).exists(),
      MultiSelectOption(including('Custom Embargo')).exists(),
      MultiSelectOption(including('Custom label')).exists(),
      MultiSelectOption(including('Description')).exists(),
      MultiSelectOption(including('Edition')).exists(),
      MultiSelectOption(including('Holdings Status')).exists(),
      MultiSelectOption(including('ISBN_Online')).exists(),
      MultiSelectOption(including('ISBN_Print')).exists(),
      MultiSelectOption(including('ISSN_Online')).exists(),
      MultiSelectOption(including('ISSN_Print')).exists(),
      MultiSelectOption(including('Managed coverage dates')).exists(),
      MultiSelectOption(including('Managed Embargo')).exists(),
      MultiSelectOption(including('Notes')).exists(),
      MultiSelectOption(including('Peer reviewed')).exists(),
      MultiSelectOption(including('Proxy')).exists(),
      MultiSelectOption(including('Publication Type')).exists(),
      MultiSelectOption(including('Publisher')).exists(),
      MultiSelectOption(including('Show to patron')).exists(),
      MultiSelectOption(including('Subjects')).exists(),
      MultiSelectOption(including('Tags')).exists(),
      MultiSelectOption(including('Title ID')).exists(),
      MultiSelectOption(including('Title name')).exists(),
      MultiSelectOption(including('Title Type')).exists(),
      MultiSelectOption(including('URL')).exists(),
    ]);
  },

  clearSelectedFieldsToExport() {
    const selector = 'li[id*="multiselect_selected"] button[icon="times"]';
    cy.get(selector).then((buttons) => {
      const buttonCount = buttons.length;
      for (let i = 0; i < buttonCount; i++) {
        cy.get(selector).then((closeButtons) => {
          cy.wrap(closeButtons[0]).click();
          cy.wait(500);
        });
      }
    });
    cy.expect(packageFieldsSelect.has({ selectedCount: 0 }));
    cy.expect(titleFieldsSelect.has({ selectedCount: 0 }));
  },

  clickExportAllPackageFields() {
    cy.do(allPackageFieldsRadioButton.click());
  },

  clickExportAllTitleFields() {
    cy.do(allTitleFieldsRadioButton.click());
  },

  verifyNumberOfTitlesLessThan(number) {
    cy.get('div[data-test-eholdings-details-view-results-count="true"]')
      .invoke('text')
      .then((text) => parseFloat(text.replace(/,/g, '')))
      .should('be.lessThan', number);
  },

  patronRadioButton: (yesOrNo) => {
    cy.expect(patronRadioButton.exists());
    cy.do(patronRadioButton.find(RadioButton(including(yesOrNo))).click());
  },

  verifyAlternativeRadio(yesOrNo) {
    cy.expect(KeyValue('Show titles in package to patrons').has({ value: including(yesOrNo) }));
  },
};
