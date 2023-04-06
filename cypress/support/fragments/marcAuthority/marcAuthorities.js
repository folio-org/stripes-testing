import { MultiColumnList, Modal, TextField, Callout, MultiSelect, QuickMarcEditorRow, PaneContent, PaneHeader, Select, Section, HTML, including, Button, MultiColumnListCell, MultiColumnListRow, SearchField, Accordion } from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const filtersSection = Section({ id: 'pane-authorities-filters' });
const marcViewSectionContent = PaneContent({ id: 'marc-view-pane-content' });
const searchInput = SearchField({ id:'textarea-authorities-search' });
const searchButton = Button({ id: 'submit-authorities-search' });
const enabledSearchButton = Button({ id: 'submit-authorities-search', disabled: false });
const browseSearchAndFilterInput = Select('Search field index');
const marcViewSection = Section({ id: 'marc-view-pane' });
const editorSection = Section({ id: 'quick-marc-editor-pane' });
const actionsButton = Button('Actions');
const marcAuthUpdatesCsvBtn = Button('MARC authority headings updates (CSV)');
const authReportModal = Modal({ id: 'authorities-report-modal' });
const fromDate = TextField({ name: 'fromDate' });
const toDate = TextField({ name: 'toDate' });
const exportButton = Button('Export');
const resetButton = Button('Reset all');
const selectField = Select({ id: 'textarea-authorities-search-qindex' });
const headinfTypeAccordion = Accordion('Type of heading');

export default {
  waitLoading: () => cy.expect(rootSection.exists()),

  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),

  clickActionsAndReportsButtons: () => {
    cy.do(rootSection.find(PaneHeader()).find(actionsButton).click());
    cy.expect(marcAuthUpdatesCsvBtn.exists());
    cy.do(marcAuthUpdatesCsvBtn.click());
    cy.expect(authReportModal.exists());
  },

  fillReportModal: (today, tomorrow) => {
    cy.do([
      fromDate.fillIn(today),
      toDate.fillIn(tomorrow),
    ]);
    cy.expect(authReportModal.find(exportButton).exists());
  },

  clickExportButton: () => {
    cy.do(authReportModal.find(exportButton).click());
  },

  checkCalloutAfterExport: (jobId) => {
     cy.expect(Callout(including(`Authority headings updates report (Job ID ${jobId}) is being generated. Go to the Export manager app to download report. It may take a few minutes for the report to complete.`)).exists());
  },

  verifyMARCAuthorityFileName(actualName) {
    // valid name example: 2023-03-26_09-51-07_7642_auth_headings_updates.csv
    const fileNameMask = /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{4}_auth_headings_updates\.csv/gm;
    expect(actualName).to.match(fileNameMask);
  },

  verifyContentOfExportFile(actual, ...expectedArray) {
    expectedArray.forEach(expectedItem => (expect(actual).to.include(expectedItem)));
  },

  select:(specialInternalId) => cy.do(authoritiesList.find(Button({ href : including(specialInternalId) })).click()),

  selectFirst: (title) => cy.do(MultiColumnListRow({ index: 0 }).find(Button(title)).click()),

  selectFirstRecord: () => cy.do(MultiColumnListRow({ index: 0 }).find(Button()).click()),

  selectTitle: (title) => cy.do(Button(title).click()),

  selectItem: (item) => {
    cy.expect(MultiColumnListCell({content: item}).exists());
    cy.do(Button(including(item)).click());
  },

  verifyFirstValueSaveSuccess(successMsg, txt) {
    cy.expect([
      Callout(successMsg).exists(),
      marcViewSectionContent.has({ text: including(`${txt.substring(0, 7)}  ${txt.substring(9, 18)}  ${txt.substring(20, 24)}`) }),
    ]);
  },

  verifySaveSuccess(successMsg, txt) {
    cy.expect([
      Callout(successMsg).exists(),
      marcViewSectionContent.has({ text: including(`${txt.substring(0, 7)}  ${txt.substring(9, 19)} ${txt.substring(20, 24)}`) }),
    ]);
  },

  checkRow:(expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),

  checkRowsCount:(expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount + 1 })).absent()),

  switchToBrowse:() => cy.do(Button({ id:'segment-navigation-browse' }).click()),

  searchBy: (parameter, value) => {
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter));
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(filtersSection.find(Button({ id: 'submit-authorities-search' })).click());
  },

  searchByParameter(searchOption, value) {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value: value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.expect(enabledSearchButton.exists());
    cy.do(searchButton.click());
  },

  searchAndVerify: (searchOption, value) => {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value: value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.expect(enabledSearchButton.exists());
    cy.do(searchButton.click());
    cy.expect(MultiColumnListRow({ index: 0 }).find(Button({ text: including('Beethoven, Ludwig van (no 010)') })).exists());
    cy.expect(marcViewSection.exists());
  },

   checkRecordDetailPageMarkedValue(markedValue) {
    cy.expect([
      marcViewSection.exists(),
      marcViewSection.has({ mark: markedValue }),
    ]);
  },
  
  checkSearchOptions() {
    cy.do(selectField.click());
    cy.expect([
      selectField.has({ content: including('Keyword') }),
      selectField.has({ content: including('Identifier (all)') }),
      selectField.has({ content: including('Personal name') }),
      selectField.has({ content: including('Corporate/Conference name') }),
      selectField.has({ content: including('Geographic name') }),
      selectField.has({ content: including('Name-title') }),
      selectField.has({ content: including('Uniform title') }),
      selectField.has({ content: including('Subject') }),
      selectField.has({ content: including('Children\'s subject heading') }),
      selectField.has({ content: including('Genre') }),
      selectField.has({ content: including('Advanced search') }),
    ]);
  },

  checkAfterSearch(type, record) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 2, content: record }).exists(),
    ]);
  },

  checkAfterSearchHeadingType(type, headingTypeA, headingTypeB) {
    cy.expect([
      MultiColumnListCell({ columnIndex: 1, content: type }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeA }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeB }).exists(),
    ]);
  },

  checkFieldAndContentExistence(tag, value) {
    cy.expect([
      marcViewSection.exists(),
      marcViewSectionContent.has({ text: including(tag) }),
      marcViewSectionContent.has({ text: including(value) }),
    ]);
  },

  check010FieldAbsence: () => {
    cy.expect([
      editorSection.exists(),
      QuickMarcEditorRow({ tagValue: '010' }).absent()
    ]);
  },

  clickResetAndCheck: (searchValue) => {
    cy.do(filtersSection.find(resetButton).click());
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id:'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Keyword') }),
      rootSection.find(HTML(including('Choose a filter or enter a search query to show results.'))).exists(),
    ]);
  },

  chooseTypeOfHeadingAndCheck(headingType, headingTypeA, headingTypeB) {
    cy.do([
      headinfTypeAccordion.clickHeader(),
      MultiSelect({ ariaLabelledby: 'headingType-multiselect-label' }).select([including(headingType)]),
    ]);
    cy.expect([
      MultiSelect({ selected: including(headingType) }).exists(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeA }).absent(),
      MultiColumnListCell({ columnIndex: 3, content: headingTypeB }).exists(),
    ]);
  },
};
