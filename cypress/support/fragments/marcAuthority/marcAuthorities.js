import { Keyboard } from '@interactors/keyboard';
import {
  Accordion,
  AdvancedSearchRow,
  Button,
  Callout,
  Checkbox,
  ColumnHeader,
  DropdownMenu,
  HTML,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  PaneContent,
  PaneHeader,
  QuickMarcEditorRow,
  SearchField,
  Section,
  Select,
  TextArea,
  TextField,
  ValueChipRoot,
  including,
  not,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const rootSection = Section({ id: 'authority-search-results-pane' });
const actionsButton = rootSection.find(Button('Actions'));
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const filtersSection = Section({ id: 'pane-authorities-filters' });
const marcViewSectionContent = PaneContent({ id: 'marc-view-pane-content' });
const searchInput = SearchField({ id: 'textarea-authorities-search' });
const searchButton = Button({ id: 'submit-authorities-search' });
const browseSearchAndFilterInput = Select('Search field index');
const marcViewSection = Section({ id: 'marc-view-pane' });
const editorSection = Section({ id: 'quick-marc-editor-pane' });
const typeOfHeadingSelect = MultiSelect({ ariaLabelledby: 'headingType-multiselect-label' });

// actions dropdown window
const authorityActionsDropDown = DropdownMenu();
const buttonExportSelected = authorityActionsDropDown.find(
  Button('Export selected records (CSV/MARC)'),
);
const marcAuthUpdatesCsvBtn = authorityActionsDropDown.find(
  Button('MARC authority headings updates (CSV)'),
);

// auth report modal
const authReportModal = Modal({ id: 'authorities-report-modal' });
const exportButton = authReportModal.find(Button('Export'));

const resetButton = Button('Reset all');
const selectField = Select({ id: 'textarea-authorities-search-qindex' });
const headingTypeAccordion = Accordion('Type of heading');
const nextButton = Button({ id: 'authority-result-list-next-paging-button' });
const searchNav = Button({ id: 'segment-navigation-search' });
const buttonLink = Button('Link');
const buttonAdvancedSearch = Button('Advanced search');
const modalAdvancedSearch = Modal('Advanced search');
const buttonSearchInAdvancedModal = Button({ ariaLabel: 'Search' });
const buttonCancelInAdvancedModal = Button({ ariaLabel: 'Cancel' });
const buttonClose = Button({ icon: 'times' });
const checkBoxAllRecords = Checkbox({ ariaLabel: 'Select all records on this page' });
const openAuthSourceMenuButton = Button({ ariaLabel: 'open menu' });
const sourceFileAccordion = Section({ id: 'sourceFileId' });
const cancelButton = Button('Cancel');
const closeLinkAuthorityModal = Button({ ariaLabel: 'Dismiss modal' });
const exportSelectedRecords = Button('Export selected records (CSV/MARC)');
const authoritySourceAccordion = Accordion({ id: 'sourceFileId' });
const authoritySourceOptions = [
  'LC Name Authority file (LCNAF)',
  'LC Subject Headings (LCSH)',
  "LC Children's Subject Headings",
  'LC Genre/Form Terms (LCGFT)',
  'LC Demographic Group Terms (LCFGT)',
  'LC Medium of Performance Thesaurus for Music (LCMPT)',
  'Faceted Application of Subject Terminology (FAST)',
  'Medical Subject Headings (MeSH)',
  'Thesaurus for Graphic Materials (TGM)',
  'Rare Books and Manuscripts Section (RBMS)',
  'Art & architecture thesaurus (AAT)',
  'GSAFD Genre Terms (GSAFD)',
  'Not specified',
];
const thesaurusAccordion = Accordion('Thesaurus');

export default {
  waitLoading() {
    cy.expect(PaneHeader('MARC authority').exists());
  },
  clickActionsAndReportsButtons() {
    cy.do([actionsButton.click(), marcAuthUpdatesCsvBtn.click()]);
    cy.expect([authReportModal.exists(), exportButton.has({ disabled: true })]);
  },
  clickHeadingsUpdatesButton() {
    cy.do([actionsButton.click(), marcAuthUpdatesCsvBtn.click()]);
  },
  fillReportModal(today, tomorrow) {
    cy.do([
      authReportModal.find(TextField({ name: 'fromDate' })).fillIn(today),
      authReportModal.find(TextField({ name: 'toDate' })).fillIn(tomorrow),
    ]);
  },
  clickClearFieldIcon({ name }) {
    cy.do(
      authReportModal
        .find(TextField({ name }))
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
    cy.expect(exportButton.has({ disabled: true }));
  },
  clickExportButton() {
    cy.do(exportButton.click());
  },
  clickCancelButtonOfReportModal() {
    cy.do(authReportModal.find(cancelButton).click());
  },
  checkValidationError({ name, error }) {
    cy.expect([
      authReportModal.find(TextField({ name })).has({ error }),
      exportButton.has({ disabled: true }),
    ]);
  },
  checkNoValidationErrors() {
    cy.expect([
      // authReportModal.find(TextField({ name })).has({ error }),
      exportButton.has({ disabled: false }),
    ]);
  },
  closeAuthReportModalUsingESC() {
    cy.get('#authorities-report-modal').type('{esc}');
  },
  switchToSearch() {
    cy.do(searchNav.click());
  },
  searchBeats(value) {
    cy.do(searchInput.fillIn(value));
    cy.do(searchButton.click());
  },
  checkFieldTagExists: () => {
    cy.expect([editorSection.exists(), QuickMarcEditorRow({ tagValue: '625' }).exists()]);
  },

  checkCalloutAfterExport: (jobId) => {
    cy.expect(
      Callout(
        including(
          `Authority headings updates report (Job ID ${jobId}) is being generated. Go to the Export manager app to download report. It may take a few minutes for the report to complete.`,
        ),
      ).exists(),
    );
  },

  checkCallout: (text) => {
    cy.expect(Callout(including(text)).exists());
  },

  checkResultsExistance: (type) => {
    cy.expect([
      rootSection.exists(),
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
    ]);
  },

  verifyMARCAuthorityFileName(actualName) {
    // valid name example: 2023-03-26_09-51-07_7642_auth_headings_updates.csv
    const fileNameMask = /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{4}_auth_headings_updates\.csv/gm;
    expect(actualName).to.match(fileNameMask);
  },

  verifyContentOfExportFile(actual, ...expectedArray) {
    expectedArray.forEach((expectedItem) => expect(actual).to.include(expectedItem));
  },

  select: (specialInternalId) => cy.do(authoritiesList.find(Button({ href: including(specialInternalId) })).click()),

  selectFirst: (title) => cy.do(MultiColumnListRow({ index: 0 }).find(Button(title)).click()),

  selectFirstRecord: () => cy.do(MultiColumnListRow({ index: 0 }).find(Button()).click()),

  selectTitle: (title) => cy.do(Button(title).click()),

  selectItem: (item, partName = true) => {
    cy.expect(MultiColumnListCell({ content: item }).exists());
    if (partName) {
      cy.do(Button(including(item)).click());
    } else {
      cy.do(Button(item).click());
    }
  },

  clickOnNumberOfTitlesLink(columnIndex, linkValue) {
    cy.wrap(MultiColumnListCell({ columnIndex, content: linkValue }).find(Link()).href()).as(
      'link',
    );
    cy.get('@link').then((link) => {
      cy.visit(link);
    });
  },

  verifyNumberOfTitles(columnIndex, linkValue) {
    cy.expect(MultiColumnListCell({ columnIndex, content: linkValue }).find(Link()).exists());
  },

  verifyFirstValueSaveSuccess(successMsg, txt) {
    cy.expect([
      Callout(successMsg).exists(),
      marcViewSectionContent.has({
        text: including(
          `${txt.substring(0, 7)}  ${txt.substring(9, 18)}  ${txt.substring(20, 24)}`,
        ),
      }),
    ]);
  },

  verifySaveSuccess(successMsg, txt) {
    cy.expect([
      Callout(successMsg).exists(),
      marcViewSectionContent.has({
        text: including(`${txt.substring(0, 7)}  ${txt.substring(9, 19)} ${txt.substring(20, 24)}`),
      }),
    ]);
  },

  checkRow: (expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),

  checkRowUpdatedAndHighlighted: (expectedHeadingReference) => cy.expect(
    authoritiesList
      .find(MultiColumnListCell({ selected: true }, including(expectedHeadingReference)))
      .exists(),
  ),

  checkRowsCount: (expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount })).absent()),

  switchToBrowse: () => cy.do(Button({ id: 'segment-navigation-browse' }).click()),

  checkDefaultBrowseOptions: (searchValue) => {
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id: 'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Select a browse option') }),
    ]);
  },

  searchBy: (parameter, value) => {
    cy.do(filtersSection.find(searchInput).selectIndex(parameter));
    cy.do(filtersSection.find(searchInput).fillIn(value));
    cy.do(filtersSection.find(searchButton).click());
  },

  searchByParameter(searchOption, value) {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.expect(searchButton.is({ disabled: false }));
    cy.do(searchButton.click());
  },

  searchAndVerify: (searchOption, value) => {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.expect(searchButton.is({ disabled: false }));
    cy.do(searchButton.click());
    cy.expect(
      MultiColumnListRow({ index: 0 })
        .find(Button({ text: including('Beethoven, Ludwig van (no 010)') }))
        .exists(),
    );
    cy.expect(marcViewSection.exists());
  },

  closeMarcViewPane() {
    cy.do(marcViewSection.find(buttonClose).click());
  },

  checkRecordDetailPageMarkedValue(markedValue) {
    cy.expect([marcViewSection.exists(), marcViewSection.has({ mark: markedValue })]);
  },

  checkSearchOptions() {
    cy.do(selectField.click());
    cy.expect([
      selectField.has({ content: including('Keyword') }),
      selectField.has({ content: including('Identifier (all)') }),
      selectField.has({ content: including('LCCN') }),
      selectField.has({ content: including('Personal name') }),
      selectField.has({ content: including('Corporate/Conference name') }),
      selectField.has({ content: including('Geographic name') }),
      selectField.has({ content: including('Name-title') }),
      selectField.has({ content: including('Uniform title') }),
      selectField.has({ content: including('Subject') }),
      selectField.has({ content: including("Children's subject heading") }),
      selectField.has({ content: including('Genre') }),
      selectField.has({ content: including('Advanced search') }),
    ]);
  },

  checkAuthorizedReferenceColumn(authorized, reference) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: authorized }).exists(),
      MultiColumnListCell({ columnIndex: 1, content: reference }).exists(),
    ]);
  },

  checkAfterSearch(type, record) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 2, content: record }).exists(),
    ]);
  },

  checkSingleHeadingType(type, headingType) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingType }).exists(),
    ]);
  },

  checkAfterSearchHeadingType(type, headingTypeA, headingTypeB) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeA }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeB }).exists(),
    ]);
  },

  checkHeadingType(type, headingTypeA, headingTypeB, headingTypeC) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeA }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeB }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeC }).exists(),
    ]);
  },

  checkType(typeA, typeB, typeC) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: typeA }).exists(),
      MultiColumnListCell({ columnIndex: 1, content: typeB }).exists(),
      MultiColumnListCell({ columnIndex: 1, content: typeC }).exists(),
    ]);
  },

  clickNextPagination() {
    cy.do(rootSection.find(nextButton).click());
  },

  clickLinkButton() {
    cy.do(buttonLink.click());
  },

  verifyLinkButtonExistOnMarcViewPane(isExist = true) {
    if (isExist) {
      cy.expect(marcViewSection.find(buttonLink).exists());
    } else {
      cy.expect(marcViewSection.find(buttonLink).absent());
    }
  },

  checkFieldAndContentExistence(tag, value) {
    cy.expect([
      marcViewSection.exists(),
      marcViewSectionContent.has({ text: including(tag) }),
      marcViewSectionContent.has({ text: including(value) }),
    ]);
  },

  check010FieldAbsence: () => {
    cy.expect([editorSection.exists(), QuickMarcEditorRow({ tagValue: '010' }).absent()]);
  },

  clickReset: () => {
    cy.do(filtersSection.find(resetButton).click());
  },

  clickResetAndCheck: (searchValue) => {
    cy.do(filtersSection.find(resetButton).click());
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id: 'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Keyword') }),
    ]);
  },

  chooseTypeOfHeading: (headingTypes) => {
    cy.then(() => headingTypeAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(headingTypeAccordion.clickHeader());
      }
    });
    const headingTypesArray = Array.isArray(headingTypes) ? headingTypes : [headingTypes];

    headingTypesArray.forEach((headingType) => {
      cy.do([typeOfHeadingSelect.select([including(headingType)])]);
      // need to wait until filter will be applied
      cy.wait(1000);
    });
  },

  enterTypeOfHeading: (headingType) => {
    cy.then(() => headingTypeAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(headingTypeAccordion.clickHeader());
      }
    });
    cy.do([
      typeOfHeadingSelect.focus(),
      Keyboard.type(headingType),
      Keyboard.press({ code: 'Enter' }),
    ]);
  },

  clickAccordionAndCheckResultList(accordion, record) {
    cy.do(Accordion(accordion).clickHeader());
    cy.expect(MultiColumnListCell({ content: including(record) }).exists());
  },

  chooseAuthoritySourceOption: (option) => {
    cy.do([
      cy.wait(1000), // without wait will immediately close accordion
      MultiSelect({ ariaLabelledby: 'sourceFileId-multiselect-label' }).select([including(option)]),
    ]);
  },

  verifyEmptyAuthorityField: () => {
    cy.expect([
      sourceFileAccordion.find(MultiSelect({ label: including('Authority source') })).exists(),
      sourceFileAccordion.find(MultiSelect({ selectedCount: 0 })).exists(),
    ]);
  },

  clickActionsButton() {
    cy.do(actionsButton.click());
  },

  actionsSortBy(value) {
    cy.do(Select({ dataTestID: 'sort-by-selection' }).choose(value));
    // need to wait until content will be sorted
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
  },

  verifyActionsSortedBy(value) {
    cy.expect(Select({ dataTestID: 'sort-by-selection', checkedOptionText: value }).exists());
  },

  actionsSelectCheckbox(value) {
    cy.do(Checkbox(value).click());
  },

  downloadSelectedRecordWithRowIdx(checkBoxNumber = 1) {
    cy.get(`div[class^="mclRow--"]:nth-child(${checkBoxNumber}) input[type="checkbox"]`).click();
    cy.do([actionsButton.click(), exportSelectedRecords.click()]);
  },

  selectAllRecords() {
    // need to wait until page loading
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.do(checkBoxAllRecords.click());
  },

  exportSelected() {
    cy.do(actionsButton.click());
    cy.do(buttonExportSelected.click());
  },

  checkRowsContent(contents) {
    contents.forEach((content, rowIndex) => {
      cy.expect(MultiColumnListCell({ row: rowIndex, content }).exists());
    });
  },

  checkColumnAbsent(content) {
    cy.expect(ColumnHeader(content).absent());
  },

  checkColumnExists(content) {
    cy.expect(ColumnHeader(content).exists());
  },

  clickOnColumnHeader(content) {
    cy.do(authoritiesList.clickHeader(content));
  },

  chooseTypeOfHeadingAndCheck(headingType, headingTypeA, headingTypeB) {
    cy.do([
      headingTypeAccordion.clickHeader(),
      typeOfHeadingSelect.select([including(headingType)]),
    ]);
    cy.expect([
      MultiSelect({ selected: including(headingType) }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeA }).absent(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeB }).exists(),
    ]);
  },

  checkNoResultsMessage(absenceMessage) {
    cy.expect(rootSection.find(HTML(including(absenceMessage))).exists());
  },

  clickAdvancedSearchButton() {
    cy.do(buttonAdvancedSearch.click());
    cy.expect(modalAdvancedSearch.exists());
  },

  fillAdvancedSearchField(rowIndex, value, searchOption, booleanOption) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).fillQuery(value));
    cy.do(AdvancedSearchRow({ index: rowIndex }).selectSearchOption(rowIndex, searchOption));
    if (booleanOption) cy.do(AdvancedSearchRow({ index: rowIndex }).selectBoolean(rowIndex, booleanOption));
  },

  clickSearchButton() {
    cy.do(buttonSearchInAdvancedModal.click());
  },

  checkSearchInput(value) {
    cy.expect(searchInput.has({ value }));
  },

  clickCancelButton() {
    cy.do(modalAdvancedSearch.find(buttonCancelInAdvancedModal).click());
  },

  checkAdvancedSearchModalAbsence() {
    cy.expect(modalAdvancedSearch.absent());
  },

  checkAdvancedSearchModalFields: (row, value, searchOption, boolean) => {
    cy.expect([
      modalAdvancedSearch.exists(),
      AdvancedSearchRow({ index: 0 }).has({ text: including('Search for') }),
      AdvancedSearchRow({ index: row })
        .find(TextArea())
        .has({ value: including(value) }),
      AdvancedSearchRow({ index: row }).has({ text: including('in') }),
      AdvancedSearchRow({ index: row })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including(searchOption) }),
      modalAdvancedSearch.find(buttonSearchInAdvancedModal).exists(),
      modalAdvancedSearch.find(buttonCancelInAdvancedModal).exists(),
    ]);
    if (boolean) {
      cy.expect([
        AdvancedSearchRow({ index: row })
          .find(Select({ label: 'Operator*' }))
          .has({ content: including(boolean) }),
      ]);
    }
  },

  checkAdvancedSearchOption(rowIndex) {
    cy.do(
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .click(),
    );
    cy.expect([
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Keyword') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Identifier (all)') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('LCCN') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Personal name') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Corporate/Conference name') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Geographic name') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Name-title') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Uniform title') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Subject') }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including("Children's subject heading") }),
      AdvancedSearchRow({ index: rowIndex })
        .find(Select({ label: 'Search options*' }))
        .has({ content: including('Genre') }),
    ]);
  },

  checkAuthoritySourceOptions() {
    cy.do(sourceFileAccordion.find(openAuthSourceMenuButton).click());
    cy.expect([
      sourceFileAccordion
        .find(MultiSelectOption(including('LC Name Authority file (LCNAF)')))
        .exists(),
      sourceFileAccordion.find(MultiSelectOption(including('LC Subject Headings (LCSH)'))).exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including("LC Children's Subject Headings")))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('LC Genre/Form Terms (LCGFT)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('LC Demographic Group Terms (LCFGT)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('LC Medium of Performance Thesaurus for Music (LCMPT)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('Faceted Application of Subject Terminology (FAST)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('Medical Subject Headings (MeSH)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('Thesaurus for Graphic Materials (TGM)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('Rare Books and Manuscripts Section (RBMS)')))
        .exists(),
      sourceFileAccordion
        .find(MultiSelectOption(including('Art & architecture thesaurus (AAT)')))
        .exists(),
      sourceFileAccordion.find(MultiSelectOption(including('GSAFD Genre Terms (GSAFD)'))).exists(),
      sourceFileAccordion.find(MultiSelectOption(including('Not specified'))).exists(),
      sourceFileAccordion
        .find(MultiSelectOption({ innerHTML: including('class="totalRecordsLabel') }))
        .exists(),
    ]);
  },

  checkResultsListRecordsCountLowerThan(totalRecord) {
    this.waitLoading();
    cy.intercept('GET', '/search/authorities?*').as('getItems');
    cy.wait('@getItems', { timeout: 10000 }).then((item) => {
      const { totalRecords } = item.response.body;
      cy.expect(Pane({ subtitle: `${totalRecords} records found` }).exists());
      expect(totalRecords).lessThan(totalRecord);
    });
  },

  checkResultsListRecordsCountGreaterThan(totalRecord) {
    this.waitLoading();
    cy.intercept('GET', '/search/authorities?*').as('getItems');
    cy.wait('@getItems', { timeout: 10000 }).then((item) => {
      const { totalRecords } = item.response.body;
      cy.expect(Pane({ subtitle: `${totalRecords} records found` }).exists());
      expect(totalRecords).greaterThan(totalRecord);
    });
  },

  checkSelectedAuthoritySource(option) {
    cy.expect(sourceFileAccordion.find(MultiSelect({ selected: including(option) })).exists());
  },

  closeAuthoritySourceOption() {
    cy.do(sourceFileAccordion.find(Button({ icon: 'times' })).click());
  },

  checkResultList(records) {
    records.forEach((record) => {
      cy.expect(MultiColumnListCell(record).exists());
    });
  },

  checkSearchOption(searchOption) {
    cy.expect(browseSearchAndFilterInput.has({ value: searchOption }));
  },

  verifyEmptyNumberOfTitles() {
    cy.expect(MultiColumnListCell({ columnIndex: 5 }).has({ content: '' }));
  },

  verifyAuthorityPropertiesAfterSearch(expectedProperties) {
    cy.intercept('GET', '/search/authorities?**').as('get-authorities');
    cy.wait('@get-authorities').its('response.statusCode').should('equal', 200);
    cy.get('@get-authorities').then((data) => {
      data.response.body.authorities.forEach((authority) => {
        expectedProperties.forEach((expectedProperty) => {
          cy.expect(authority).to.have.property(expectedProperty);
        });
      });
    });
  },

  verifyHeadingsUpdatesDataViaAPI(startDate, endDate, expectedDataObject) {
    cy.getAuthorityHeadingsUpdatesViaAPI(startDate, endDate).then((updatesData) => {
      const selectedUpdate = updatesData.filter(
        (update) => update.headingNew === expectedDataObject.headingNew,
      );
      cy.expect(selectedUpdate[0].naturalIdOld).to.equal(expectedDataObject.naturalIdOld);
      cy.expect(selectedUpdate[0].naturalIdNew).to.equal(expectedDataObject.naturalIdNew);
      cy.expect(selectedUpdate[0].headingNew).to.equal(expectedDataObject.headingNew);
      cy.expect(selectedUpdate[0].headingOld).to.equal(expectedDataObject.headingOld);
      cy.expect(selectedUpdate[0].sourceFileNew).to.equal(expectedDataObject.sourceFileNew);
      cy.expect(selectedUpdate[0].sourceFileOld).to.equal(expectedDataObject.sourceFileOld);
      cy.expect(selectedUpdate[0].lbTotal).to.equal(expectedDataObject.lbTotal);
      cy.expect(selectedUpdate[0].lbUpdated).to.equal(expectedDataObject.lbUpdated);
      cy.expect(selectedUpdate[0].metadata.startedAt).to.have.string(expectedDataObject.startedAt);
      cy.expect(selectedUpdate[0].metadata.startedByUserFirstName).to.equal(
        expectedDataObject.startedByUserFirstName,
      );
      cy.expect(selectedUpdate[0].metadata.startedByUserLastName).to.equal(
        expectedDataObject.startedByUserLastName,
      );
    });
  },

  verifyHeadingsUpdateExistsViaAPI(startDate, endDate, newHeading, matchesCounter = 1) {
    cy.getAuthorityHeadingsUpdatesViaAPI(startDate, endDate).then((updatesData) => {
      const selectedUpdate = updatesData.filter((update) => update.headingNew === newHeading);
      cy.expect(selectedUpdate.length).to.be.at.least(matchesCounter);
    });
  },

  verifyHeadingsUpdatesCountAndStructureViaAPI(startDate, endDate, limit) {
    cy.getAuthorityHeadingsUpdatesViaAPI(startDate, endDate, limit).then((updatesData) => {
      cy.expect(updatesData.length).to.equal(Number(limit));
      updatesData.forEach((update) => {
        cy.expect(update).to.have.property('naturalIdOld');
        cy.expect(update).to.have.property('naturalIdNew');
        cy.expect(update).to.have.property('headingNew');
        cy.expect(update).to.have.property('headingOld');
        cy.expect(update).to.have.property('sourceFileNew');
        cy.expect(update).to.have.property('sourceFileOld');
        cy.expect(update).to.have.property('lbTotal');
        cy.expect(update).to.have.property('lbUpdated');
        cy.expect(update).to.have.property('metadata');
        cy.expect(update.metadata).to.have.property('startedAt');
        cy.expect(update.metadata).to.have.property('startedByUserFirstName');
        cy.expect(update.metadata).to.have.property('startedByUserLastName');
      });
    });
  },

  checkDetailViewIncludesText(text) {
    cy.expect(marcViewSection.find(HTML(including(text))).exists());
  },

  verifyEnabledSearchButton() {
    cy.expect(searchButton.has({ disabled: false }));
  },

  verifyDisabledSearchButton() {
    cy.expect(searchButton.has({ disabled: true }));
  },

  closeAuthorityLinkingModal() {
    cy.do(closeLinkAuthorityModal.click());
  },

  verifyResultsRowContent(heading, type, headingType) {
    cy.expect(MultiColumnListRow(including(heading), { isContainer: false }).exists());
    if (type) {
      cy.expect(
        MultiColumnListRow(including(heading), { isContainer: false })
          .find(MultiColumnListCell(type))
          .exists(),
      );
    }
    if (headingType) {
      cy.expect(
        MultiColumnListRow(including(heading), { isContainer: false })
          .find(MultiColumnListCell(headingType))
          .exists(),
      );
    }
  },
  verifyTextOfPaneHeaderMarcAuthority(text) {
    cy.expect(
      PaneHeader('MARC authority')
        .find(HTML(including(text)))
        .exists(),
    );
  },

  verifySearchResultTabletIsAbsent(absent = true) {
    if (absent) {
      cy.expect(authoritiesList.absent());
    } else {
      cy.expect(authoritiesList.exists());
    }
  },

  getMarcAuthoritiesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'search/authorities',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body.authorities;
      });
  },

  checkValueResultsColumn: (columnIndex, value) => {
    cy.expect([
      rootSection.exists(),
      MultiColumnListCell({ columnIndex, content: value }).exists(),
    ]);
  },

  verifyThesaurusAccordionAndClick: () => {
    cy.expect(thesaurusAccordion.exists());
    cy.do(thesaurusAccordion.clickHeader());
  },

  chooseThesaurus: (thesaurusTypes) => {
    cy.do(
      MultiSelect({ ariaLabelledby: 'subjectHeadings-multiselect-label' }).select([
        including(thesaurusTypes),
      ]),
    );
  },

  verifySelectedTextOfThesaurus: (thesaurusTypes) => {
    cy.expect(MultiSelect({ selected: including(thesaurusTypes) }).exists());
  },

  checkHeadingReferenceColumnValueIsBold(rowNumber) {
    cy.expect(
      MultiColumnListCell({ row: rowNumber, columnIndex: 2 }).has({
        innerHTML: including('anchorLink--'),
      }),
    );
  },

  checkCellValueIsExists(rowNumber, columnIndex, value) {
    cy.expect(
      MultiColumnListCell({ row: rowNumber, columnIndex }).has({
        content: including(value),
      }),
    );
  },

  clickAuthoritySourceAccordion() {
    cy.do([authoritySourceAccordion.clickHeader()]);
  },

  verifyAuthoritySourceAccordionCollapsed() {
    cy.expect([authoritySourceAccordion.has({ open: false })]);
  },

  checkResultsSelectedByAuthoritySource(options) {
    authoritySourceOptions.forEach((option) => {
      if (options.includes(option)) {
        cy.expect([MultiColumnListCell({ columnIndex: 4, content: option }).exists()]);
      } else {
        cy.expect([MultiColumnListCell({ columnIndex: 4, content: option }).absent()]);
      }
    });
  },

  checkResultsListRecordsCount() {
    const alias = `getItems${getRandomPostfix()}`;
    cy.intercept('GET', '/search/authorities?*').as(alias);
    cy.wait(`@${alias}`, { timeout: 10000 }).then((item) => {
      const { totalRecords } = item.response.body;
      cy.expect(Pane({ subtitle: including(`${totalRecords}`) }).exists());
    });
  },

  removeAuthoritySourceOption: (option) => {
    cy.do(
      sourceFileAccordion
        .find(ValueChipRoot(option))
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(ValueChipRoot(option).absent());
  },

  getResultsListByColumn(columnIndex) {
    const cells = [];

    cy.wait(2000);
    return cy
      .get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        // from each row, choose specific cell
        cy.get(`[class*="mclCell-"]:nth-child(${columnIndex + 1})`, { withinSubject: $row })
          // extract its text content
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => cells);
  },

  checkResultListSortedByColumn(columnIndex, isAscending = true) {
    this.getResultsListByColumn(columnIndex).then((cells) => {
      if (isAscending) {
        cy.expect(cells).to.deep.equal(cells.sort((a, b) => a - b));
      } else {
        cy.expect(cells).to.deep.equal(cells.sort((a, b) => b - a));
      }
    });
  },

  verifyOnlyOneAuthorityRecordInResultsList() {
    this.getResultsListByColumn(1).then((cells) => {
      const authorizedRecords = cells.filter((element) => {
        return element === 'Authorized';
      });
      cy.expect(authorizedRecords.length).to.equal(1);
    });
  },

  verifySelectedTextOfHeadingType: (headingType) => {
    cy.expect(headingTypeAccordion.exists());
    cy.do(headingTypeAccordion.clickHeader());
    cy.expect(MultiSelect({ selected: including(headingType) }).exists());
  },

  checkTotalRecordsForOption(option, totalRecords) {
    cy.do(sourceFileAccordion.find(openAuthSourceMenuButton).click());
    cy.expect(sourceFileAccordion.find(MultiSelectOption(including(option))).has({ totalRecords }));
  },

  verifyColumnValuesOnlyExist(column, expectedValues = []) {
    const actualValues = [];
    cy.then(() => authoritiesList.rowCount())
      .then((rowsCount) => {
        for (let i = 0; i < rowsCount; i++) {
          cy.then(() => authoritiesList.find(MultiColumnListCell({ column, row: i })).content()).then((content) => {
            actualValues.push(content);
          });
        }
      })
      .then(() => {
        const isOnlyValuesExist = actualValues.every((value) => expectedValues.includes(value));
        expect(isOnlyValuesExist).to.equal(true);
      });
  },

  unselectHeadingType: (headingType) => {
    cy.do([
      typeOfHeadingSelect
        .find(ValueChipRoot(headingType))
        .find(Button({ icon: 'times' }))
        .click(),
    ]);
    // need to wait until filter will be applied
    cy.wait(1000);
    cy.expect(typeOfHeadingSelect.has({ selected: not(headingType) }));
  },

  resetTypeOfHeading() {
    cy.do(
      Accordion({ id: 'headingType' })
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
    cy.expect(typeOfHeadingSelect.has({ selectedCount: 0 }));
  },

  verifySelectedTextOfAuthoritySourceAndCount: (authoritySource, count = '') => {
    cy.do(sourceFileAccordion.find(openAuthSourceMenuButton).click());
    cy.expect([
      MultiSelect({ selected: including(authoritySource) }).exists(),
      sourceFileAccordion.find(MultiSelectOption(including(`(${count})`))).exists(),
    ]);
  },

  verifyAllCheckboxesAreUnchecked() {
    cy.get(checkBoxAllRecords).each((checkbox) => {
      cy.expect(!checkbox.checked);
    });
  },

  verifyValueDoesntExistInColumn(column, value) {
    const actualValues = [];
    cy.then(() => authoritiesList.rowCount())
      .then((rowsCount) => {
        if (rowsCount) {
          for (let i = 0; i < rowsCount; i++) {
            cy.then(() => authoritiesList.find(MultiColumnListCell({ column, row: i })).content()).then((content) => {
              actualValues.push(content);
            });
          }
        }
      })
      .then(() => {
        const valueNotExist = !actualValues.includes(value);
        expect(valueNotExist).to.equal(true);
      });
  },

  verifyEveryRowContainsLinkButton() {
    cy.then(() => authoritiesList.rowCount()).then((rowsCount) => {
      if (rowsCount) {
        for (let i = 0; i < rowsCount; i++) {
          cy.expect(
            authoritiesList
              .find(MultiColumnListCell({ column: 'Link', row: i }))
              .find(Button({ icon: 'link' }))
              .exists(),
          );
        }
      }
    });
  },

  verifySelectedTypeOfHeading(option, isExist = true) {
    if (isExist) {
      cy.expect(typeOfHeadingSelect.has({ selected: including(option) }));
    } else {
      cy.expect(typeOfHeadingSelect.has({ selected: not(including(option)) }));
    }
  },

  verifySelectedTypeOfHeadingCount(selectedCount) {
    cy.expect(typeOfHeadingSelect.has({ selectedCount }));
  },
};
