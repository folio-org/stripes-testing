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
  including,
} from '../../../../interactors';

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
const headinfTypeAccordion = Accordion('Type of heading');
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

  selectItem: (item) => {
    cy.expect(MultiColumnListCell({ content: item }).exists());
    cy.do(Button(including(item)).click());
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

  checkRowsCount: (expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount + 1 })).absent()),

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
    cy.do(buttonClose.click());
  },

  checkRecordDetailPageMarkedValue(markedValue) {
    cy.expect([marcViewSection.exists(), marcViewSection.has({ mark: markedValue })]);
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
    cy.do(headinfTypeAccordion.clickHeader());
    headingTypes.forEach((headingType) => {
      cy.do(
        MultiSelect({ ariaLabelledby: 'headingType-multiselect-label' }).select([
          including(headingType),
        ]),
      );
    });
  },

  clickAccordionAndCheckResultList(accordion, record) {
    cy.do(Accordion(accordion).clickHeader());
    cy.expect(MultiColumnListCell({ content: including(record) }).exists());
  },

  chooseAuthoritySourceOption: (option) => {
    cy.do(
      MultiSelect({ ariaLabelledby: 'sourceFileId-multiselect-label' }).select([including(option)]),
    );
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

  actionsSelectCheckbox(value) {
    cy.do(Checkbox(value).click());
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

  chooseTypeOfHeadingAndCheck(headingType, headingTypeA, headingTypeB) {
    cy.do([
      headinfTypeAccordion.clickHeader(),
      MultiSelect({ ariaLabelledby: 'headingType-multiselect-label' }).select([
        including(headingType),
      ]),
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
    cy.expect(MultiColumnListCell({ columnIndex: 4 }).has({ content: '' }));
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
};
