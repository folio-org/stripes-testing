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
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelect,
  MultiSelectOption,
  Callout,
  TextField,
  FieldSet,
  PaneHeader,
} from '../../../../interactors';
import EHoldingsPackages from './eHoldingsPackages';
import EHoldingsResourceView from './eHoldingsResourceView';
import ExportSettingsModal from './modals/exportSettingsModal';
import FilterTitlesModal from './modals/filterTitlesModal';
import NoteEditForm from '../notes/existingNoteEdit';

const actionsButton = Button('Actions');
const exportButton = Button('Export package (CSV)');

const packageTitlesSection = Section({ id: 'packageShowTitles' });
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

const packageInformationSection = Section({ id: 'packageShowInformation' });
const notesSection = Section({ id: 'packageShowNotes' });
const titlesSection = Section({ id: 'packageShowTitles' });
const agreementsAccordion = Accordion('Agreements');
const deleteAgreementModal = Modal('Delete agreement line');

export default {
  getCalloutMessageText,
  close() {
    cy.do(Button({ icon: 'times' }).click());
    EHoldingsPackages.waitLoading();
  },

  waitLoading() {
    cy.expect([packageInformationSection.exists(), Button('Actions').exists()]);
  },

  openExportModal({ exportDisabled = false } = {}) {
    cy.do([PaneHeader().find(actionsButton).click(), exportButton.click()]);
    ExportSettingsModal.verifyModalView({ exportDisabled });

    return ExportSettingsModal;
  },
  openFilterTitlesModal() {
    cy.do(packageTitlesSection.find(Button({ icon: 'search' })).click());
    FilterTitlesModal.verifyModalView();

    return FilterTitlesModal;
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
    cy.do(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).click());
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
    cy.expect(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).exists());
  },

  verifyPackageDetailViewIsOpened: (name, titlesNumber, status) => {
    cy.expect([
      Pane(name).exists(),
      packageInformationSection.find(KeyValue('Total titles')).has({ floatValue: titlesNumber }),
      Accordion('Holding status').has({ content: including(status) }),
    ]);
  },

  verifyDetailViewPage(name, status) {
    cy.expect([
      Pane(name).exists(),
      Accordion('Holding status').has({ content: including(status) }),
    ]);
  },

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  getTotalTitlesCount() {
    return cy.then(() => packageInformationSection.find(KeyValue('Total titles')).floatValue());
  },
  getFilteredTitlesCount() {
    return cy
      .then(() => packageTitlesSection.find(KeyValue('Records found')).value())
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
  checkNotesSectionContent(notes = []) {
    // wait for section to load
    cy.wait(900);

    notes.forEach((note, index) => {
      cy.expect([
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(`Title: ${note.title}`) }),
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(`Details: ${note.details.slice(0, 255)}`) }),
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: note.type }),
      ]);
    });

    if (!notes.length) {
      cy.expect(notesSection.find(HTML('No notes found')).exists());
    }
  },
  openAddNewNoteForm() {
    cy.do(notesSection.find(Button('New')).click());
    NoteEditForm.waitLoading();

    return NoteEditForm;
  },
  selectTitleRecordByTitle(title, rowNumber = 0) {
    cy.do(
      titlesSection
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` }))
        .find(MultiColumnListCell({ content: title }))
        .find(Button())
        .click(),
    );
    EHoldingsResourceView.waitLoading();
    return EHoldingsResourceView;
  },

  selectTitleRecord(rowNumber = 0) {
    cy.do(
      titlesSection
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .find(Button())
        .click(),
    );
    EHoldingsResourceView.waitLoading();
    return EHoldingsResourceView;
  },

  verifyNoCoveragesDatesSet() {
    cy.expect(KeyValue('Custom coverage dates').absent());
  },

  verifyCoverageDatesSet(startDate, endDate) {
    cy.expect(KeyValue('Custom coverage dates').exists());
    cy.expect(KeyValue('Custom coverage dates').has({ value: including(startDate) }));
    cy.expect(KeyValue('Custom coverage dates').has({ value: including(endDate) }));
  },

  edit() {
    cy.expect(KeyValue('Package type').exists());
    cy.expect(KeyValue('Total titles').exists());
    cy.do([PaneHeader().find(actionsButton).click(), Button('Edit').click()]);
    cy.wait(3000);
  },

  verifyDeleteAgreementIconExists(agreementName) {
    cy.expect(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).exists());
  },

  clickDeleteAgreementIcon(agreementName) {
    cy.get('#packageShowAgreements')
      .contains('[role="row"]', agreementName)
      .find('[data-test-delete-agreement="true"]')
      .first()
      .click();
  },

  verifyDeleteAgreementModal() {
    cy.expect([
      deleteAgreementModal.exists(),
      deleteAgreementModal.find(Button('Cancel')).exists(),
      deleteAgreementModal.find(Button('Delete')).exists(),
    ]);
  },

  cancelDeleteAgreement() {
    cy.do(deleteAgreementModal.find(Button('Cancel')).click());
  },

  confirmDeleteAgreement() {
    cy.do(deleteAgreementModal.find(Button('Delete')).click());
  },

  verifyAgreementNotLinked(agreementName) {
    cy.expect(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).absent());
  },
};
