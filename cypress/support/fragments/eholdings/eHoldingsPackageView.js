import {
  Button,
  Checkbox,
  HTML,
  Link,
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
  PaneHeader,
  DropdownMenu,
  Select,
  or,
} from '../../../../interactors';
import EHoldingsPackages from './eHoldingsPackages';
import EHoldingsProviderView from './eHoldingsProviderView';
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

const packageInformationSection = Section({ id: 'packageShowInformation' });
const notesSection = Section({ id: 'packageShowNotes' });
const titlesSection = Section({ id: 'packageShowTitles' });
const agreementsAccordion = Accordion('Agreements');
const deleteAgreementModal = Modal('Delete agreement line');
const accessStatusTypeKeyValue = KeyValue('Access status type');
const byAccessStatusTypesCheckbox = Checkbox('Search by access status types only');
const titlesShowColumns = [
  'Status',
  'Managed coverage',
  'Custom coverage',
  'Managed embargo period',
  'Custom embargo period',
  'Publication type',
  'Access status type',
  'Tags',
];
const visibilityPfCheckbox = Checkbox('In Publication Finder');
const visibilityFtfCheckbox = Checkbox('In Full Text Finder');
const visibilityMarcCheckbox = Checkbox('In MARC export');

const closeIconButton = Button({ icon: 'times' });
const filterTitlesSearchButton = Button({ icon: 'search' });
const newButton = Button('New');
const editButton = Button('Edit');
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');
const saveAndCloseButton = Button('Save & close');
const proxySelect = Select('Proxy');
const packageShowAgreementsAccordion = Accordion({ id: 'packageShowAgreements' });
const holdingStatusAccordion = Accordion('Holding status');
const packageTypeKeyValue = KeyValue('Package type');
const providerKeyValue = KeyValue('Provider');
const titlesSelectedKeyValue = KeyValue('Titles selected');
const totalTitlesKeyValue = KeyValue('Total titles');
const packageDisplayNameKeyValue = KeyValue('Package display name');
const customAlternateNamesKeyValue = KeyValue('Custom alternate names');
const recordsFoundKeyValue = KeyValue('Records found');
const customCoverageDatesKeyValue = KeyValue('Custom coverage dates');
const noNotesFoundText = HTML('No notes found');
const providerLink = Link({ href: including('/eholdings/providers/') });
const searchByTagsOnlyCheckbox = Checkbox('Search by tags only');
const relevanceRadioButton = RadioButton('Relevance');
const titleRadioButton = RadioButton('Title');
const allRadioButton = RadioButton('All');
const selectedRadioButton = RadioButton('Selected');
const notSelectedRadioButton = RadioButton('Not selected');
const nextButton = Button('Next');
const previousButton = Button('Previous');
const titlesSearchTextField = TextField({ type: 'search' });

const packageExportFieldOptions = [
  'Access Status Type',
  'Agreements',
  'Automatically Select titles',
  'Custom Coverage',
  'Holdings status',
  'Notes',
  'Package Content Type',
  'Package Id',
  'Package Level Token',
  'Package Name',
  'Package Type',
  'Provider Id',
  'Provider Level Token',
  'Provider Name',
  'Proxy',
  'Show To Patrons',
  'Tags',
];

const titleExportFieldOptions = [
  'Access status type',
  'Agreements',
  'Alternate title(s)',
  'Contributors',
  'Coverage statement',
  'Custom coverage dates',
  'Custom Embargo',
  'Custom label',
  'Description',
  'Edition',
  'Holdings Status',
  'ISBN_Online',
  'ISBN_Print',
  'ISSN_Online',
  'ISSN_Print',
  'Managed coverage dates',
  'Managed Embargo',
  'Notes',
  'Peer reviewed',
  'Proxy',
  'Publication Type',
  'Publisher',
  'Show to patron',
  'Subjects',
  'Tags',
  'Title ID',
  'Title name',
  'Title Type',
  'URL',
];

const publicationTypes = [
  'All',
  'Audiobook',
  'Book',
  'Book Series',
  'Database',
  'Journal',
  'Newsletter',
  'Newspaper',
  'Proceedings',
  'Report',
  'Streaming Audio',
  'Streaming Video',
  'Thesis & Dissertation',
  'Website',
  'Unspecified',
];

export default {
  getCalloutMessageText,
  close() {
    cy.do(closeIconButton.click());
    EHoldingsPackages.waitLoading();
  },

  waitLoading() {
    cy.expect([packageInformationSection.exists(), actionsButton.exists()]);
  },

  openExportModal({ exportDisabled = false } = {}) {
    cy.do([PaneHeader().find(actionsButton).click(), exportButton.click()]);
    ExportSettingsModal.verifyModalView({ exportDisabled });

    return ExportSettingsModal;
  },
  openFilterTitlesModal() {
    cy.do(packageTitlesSection.find(filterTitlesSearchButton).click());
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
    cy.window().then((win) => {
      cy.stub(win, 'open').callsFake((url) => {
        // eslint-disable-next-line no-param-reassign
        win.location.href = url;
      });
    });
    cy.do(
      packageShowAgreementsAccordion.find(newButton).perform((element) => {
        element.removeAttribute('target');
        element.click();
      }),
    );
  },

  addExistingAgreement() {
    cy.do(addAgreementButton.click());
  },

  searchForExistingAgreement(agreementName) {
    cy.get('[id="plugin-find-agreement-modal"]').invoke('css', 'opacity', '1');
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
    cy.expect(packageTypeKeyValue.has({ value: packageType }));
  },

  verifyProvider(providerName) {
    cy.expect(packageInformationSection.find(providerKeyValue).has({ value: providerName }));
  },

  verifyTitlesSelected(count) {
    cy.expect(packageInformationSection.find(titlesSelectedKeyValue).has({ floatValue: count }));
  },

  verifyTotalTitles(count) {
    cy.expect(packageInformationSection.find(totalTitlesKeyValue).has({ floatValue: count }));
  },

  verifyPackageDisplayName(displayName) {
    cy.expect(packageDisplayNameKeyValue.has({ value: displayName }));
  },

  verifyCustomAlternateNames(alternateName) {
    cy.expect(customAlternateNamesKeyValue.has({ value: including(alternateName) }));
  },

  verifyLinkedAgreement(agreementName) {
    cy.expect(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).exists());
  },

  verifyPackageDetailViewIsOpened: (name, titlesNumber, status) => {
    cy.expect([
      Pane(name).exists(),
      packageInformationSection.find(totalTitlesKeyValue).has({ floatValue: titlesNumber }),
      holdingStatusAccordion.has({ content: including(status) }),
    ]);
  },

  verifyDetailViewPage(name, status) {
    cy.expect([Pane(name).exists(), holdingStatusAccordion.has({ content: including(status) })]);
  },

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  getTotalTitlesCount() {
    return cy.then(() => packageInformationSection.find(totalTitlesKeyValue).floatValue());
  },
  getFilteredTitlesCount() {
    return cy
      .then(() => packageTitlesSection.find(recordsFoundKeyValue).value())
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
    packageExportFieldOptions.forEach((option) => {
      cy.expect(MultiSelectOption(including(option)).exists());
    });
  },

  verifySelectedTitleFieldsOptions() {
    cy.do(titleFieldsSelect.find(openDropdownMenu).click());
    titleExportFieldOptions.forEach((option) => {
      cy.expect(MultiSelectOption(including(option)).exists());
    });
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

  chooseExclusionOptions({ pf = false, ftf = false, marc = false } = {}) {
    if (pf) cy.do(visibilityPfCheckbox.checkIfNotSelected());
    else cy.do(visibilityPfCheckbox.uncheckIfSelected());
    if (ftf) cy.do(visibilityFtfCheckbox.checkIfNotSelected());
    else cy.do(visibilityFtfCheckbox.uncheckIfSelected());
    if (marc) cy.do(visibilityMarcCheckbox.checkIfNotSelected());
    else cy.do(visibilityMarcCheckbox.uncheckIfSelected());

    this.verifyExclusionOptions({ pf, ftf, marc });
  },

  verifyExclusionOptions({ pf = false, ftf = false, marc = false } = {}) {
    cy.expect([
      visibilityPfCheckbox.has({ checked: pf, disabled: or(true, false) }),
      visibilityFtfCheckbox.has({ checked: ftf, disabled: or(true, false) }),
      visibilityMarcCheckbox.has({ checked: marc, disabled: or(true, false) }),
    ]);
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
      cy.expect(notesSection.find(noNotesFoundText).exists());
    }
  },
  openAddNewNoteForm() {
    cy.do(notesSection.find(newButton).click());
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
    cy.expect(customCoverageDatesKeyValue.absent());
  },

  verifyCoverageDatesSet(startDate, endDate) {
    cy.expect(customCoverageDatesKeyValue.exists());
    cy.expect(customCoverageDatesKeyValue.has({ value: including(startDate) }));
    cy.expect(customCoverageDatesKeyValue.has({ value: including(endDate) }));
  },

  edit() {
    cy.expect(packageTypeKeyValue.exists());
    cy.expect(totalTitlesKeyValue.exists());
    cy.wait(3000);
    cy.do([PaneHeader().find(actionsButton).click(), editButton.click()]);
    cy.expect([
      proxySelect.exists(),
      saveAndCloseButton.has({ disabled: true }),
      cancelButton.has({ disabled: true }),
    ]);
  },

  clickProviderLink() {
    cy.do(packageInformationSection.find(providerLink).click());
    EHoldingsProviderView.waitLoading();
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
      deleteAgreementModal.find(cancelButton).exists(),
      deleteAgreementModal.find(deleteButton).exists(),
    ]);
  },

  cancelDeleteAgreement() {
    cy.do(deleteAgreementModal.find(cancelButton).click());
  },

  confirmDeleteAgreement() {
    cy.do(deleteAgreementModal.find(deleteButton).click());
  },

  verifyAgreementNotLinked(agreementName) {
    cy.expect(agreementsAccordion.find(MultiColumnListCell({ content: agreementName })).absent());
  },

  verifyTitlesTableColumns(columns) {
    columns.forEach((column) => {
      cy.expect(titlesSection.find(HTML(including(column))).exists());
    });
  },

  verifyTitlesSearchElements() {
    cy.expect([
      titlesSection.find(actionsButton).exists(),
      titlesSection.find(TextField()).exists(),
    ]);
  },

  findTitleInList(titleName) {
    cy.expect(titlesSection.find(MultiColumnListCell(including(titleName))).exists());
  },

  verifyPaginationButtonState(buttonName, isEnabled) {
    const buttonSelector = Button(buttonName);
    if (isEnabled) {
      cy.expect(buttonSelector.has({ disabled: false }));
    } else {
      cy.expect(buttonSelector.has({ disabled: true }));
    }
  },

  clickNextPaginationButton() {
    cy.do(nextButton.click());
    cy.wait(1000);
  },

  verifyNextPageTitlesDisplayed() {
    cy.wait(500);
    cy.expect(titlesSection.exists());
  },

  clickPreviousPaginationButton() {
    cy.do(previousButton.click());
    cy.wait(1000);
  },

  verifyFirstPageTitlesDisplayed() {
    cy.wait(500);
    cy.expect([titlesSection.exists(), previousButton.has({ disabled: true })]);
  },

  verifyAccessStatusType(accessStatusTypeName) {
    cy.expect(accessStatusTypeKeyValue.has({ value: accessStatusTypeName }));
  },

  clickActionsButtonInTitlesSection(dropdownMenuOpened = true) {
    cy.do(titlesSection.find(actionsButton).click());
    if (dropdownMenuOpened) cy.expect(DropdownMenu().exists());
    else cy.expect(DropdownMenu().absent());
  },

  openAccessStatusTypesDropdown() {
    cy.do(DropdownMenu().find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(DropdownMenu().find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(DropdownMenu().find(MultiSelect()).open());
  },

  selectAccessStatusType(accessStatusType) {
    cy.do(DropdownMenu().find(MultiSelectOption(accessStatusType)).click());
  },

  filterTitlesByAccessStatusTypes(accessStatusTypeNames) {
    const typeNames = Array.isArray(accessStatusTypeNames)
      ? accessStatusTypeNames
      : [accessStatusTypeNames];
    this.clickActionsButtonInTitlesSection();
    this.openAccessStatusTypesDropdown();
    typeNames.forEach((typeName) => {
      this.selectAccessStatusType(typeName);
    });
  },

  verifyFilteredTitlesCount(expectedCount) {
    cy.expect(
      titlesSection
        .find(recordsFoundKeyValue)
        .has({ value: expectedCount.toLocaleString('en-US') }),
    );
  },

  verifyTitlesActionsMenuOptions() {
    cy.expect([
      DropdownMenu().find(searchByTagsOnlyCheckbox).exists(),
      DropdownMenu().find(byAccessStatusTypesCheckbox).exists(),
      DropdownMenu().find(relevanceRadioButton).exists(),
      DropdownMenu().find(titleRadioButton).exists(),
      DropdownMenu().find(allRadioButton).exists(),
      DropdownMenu().find(selectedRadioButton).exists(),
      DropdownMenu().find(notSelectedRadioButton).exists(),
      DropdownMenu().find(Select()).exists(),
    ]);
  },

  verifyPublicationTypeDropdownOptions() {
    publicationTypes.forEach((type) => {
      cy.expect(
        DropdownMenu()
          .find(Select())
          .has({ content: including(type) }),
      );
    });
  },

  verifyTitlesShowColumnsCheckboxes() {
    titlesShowColumns.forEach((column) => {
      cy.expect(DropdownMenu().find(Checkbox(column)).is({ checked: true }));
    });
  },

  uncheckAllShowColumnsCheckboxes() {
    titlesShowColumns.forEach((column) => {
      cy.do(DropdownMenu().find(Checkbox(column)).uncheckIfSelected());
    });
  },

  checkAllShowColumnsCheckboxes() {
    titlesShowColumns.forEach((column) => {
      cy.do(DropdownMenu().find(Checkbox(column)).checkIfNotSelected());
    });
  },

  verifyOnlyTitleColumnDisplayed() {
    cy.expect(titlesSection.find(HTML(including('Title'))).exists());
    titlesShowColumns.forEach((column) => {
      cy.expect(titlesSection.find(HTML(column)).absent());
    });
  },

  collapseTitlesSection() {
    cy.do(titlesSection.toggle());
    cy.expect(titlesSection.is({ expanded: false }));
  },

  expandTitlesSection() {
    cy.do(titlesSection.toggle());
    cy.expect(titlesSection.is({ expanded: true }));
  },

  checkShowColumnCheckboxAndVerify(columnName) {
    cy.do(DropdownMenu().find(Checkbox(columnName)).checkIfNotSelected());
    cy.expect(titlesSection.find(HTML(including(columnName))).exists());
  },

  uncheckShowColumnCheckbox(columnName) {
    cy.do(DropdownMenu().find(Checkbox(columnName)).uncheckIfSelected());
  },

  verifyColumnNotDisplayed(columnName) {
    cy.expect(titlesSection.find(HTML(columnName)).absent());
  },

  searchWithinTitles(titleName) {
    cy.do(titlesSection.find(titlesSearchTextField).fillIn(titleName));
    cy.intercept('GET', '**/eholdings/packages/*/resources?**').as('getTitleResults');
    cy.get('#packageShowTitles input[type="search"]').type('{enter}');
    cy.wait('@getTitleResults').its('response.statusCode').should('eq', 200);
  },

  filterTitlesBySelectionStatus(status) {
    cy.do(DropdownMenu().find(RadioButton(status)).click());
    cy.wait(1000);
  },

  assertAgreementLinesList(rows = []) {
    rows.forEach((row) => {
      const columnsEntries = Object.entries(row).map(([k, v]) => [
        `list-column-${k.toLocaleLowerCase()}`,
        v,
      ]);

      columnsEntries.forEach(([columnId, value]) => {
        cy.expect(
          agreementsAccordion
            .find(MultiColumnListRow({ content: including(row.name), isContainer: false }))
            .find(MultiColumnListCell({ columnId, content: including(value) }))
            .exists(),
        );
      });
    });
  },
};
