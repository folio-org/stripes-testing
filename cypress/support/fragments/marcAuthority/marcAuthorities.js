import { Keyboard } from '@interactors/keyboard';
import {
  Accordion,
  AdvancedSearchRow,
  Button,
  Callout,
  Checkbox,
  ColumnHeader,
  DropdownMenu,
  Dropdown,
  HTML,
  Link,
  ListRow,
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
  Tooltip,
  ValueChipRoot,
  including,
  not,
  or,
  and,
  matching,
  MultiColumnListHeader,
} from '../../../../interactors';
import { MARC_AUTHORITY_BROWSE_OPTIONS, MARC_AUTHORITY_SEARCH_OPTIONS } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';
import QuickMarcEditorWindow from '../quickMarcEditor';
import parseMrkFile from '../../utils/parseMrkFile';
import FileManager from '../../utils/fileManager';
import DateTools from '../../utils/dateTools';

const rootSection = Section({ id: 'authority-search-results-pane' });
const actionsButton = rootSection.find(Button('Actions'));
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const filtersSection = Section({ id: 'pane-authorities-filters' });
const marcViewSectionContent = PaneContent({ id: 'marc-view-pane-content' });
const searchInput = SearchField({ id: 'textarea-authorities-search' });
const searchResults = PaneContent({ id: 'authority-search-results-pane-content' });
const searchButton = Button({ id: 'submit-authorities-search' });
const browseSearchAndFilterInput = Select('Search field index');
const marcViewSection = Section({ id: 'marc-view-pane' });
const editorSection = Section({ id: 'quick-marc-editor-pane' });
const typeOfHeadingSelect = MultiSelect({ label: 'Type of heading' });
const findAuthorityModal = Modal({ id: 'find-authority-modal' });
const detailsMarcViewPaneheader = PaneHeader({ id: 'paneHeadermarc-view-pane' });
const authorityActionsDropDown = Dropdown('Actions');
const checkboxSeletAuthorityRecord = Checkbox({ ariaLabel: 'Select Authority record' });
const emptyResultsMessage = 'Choose a filter or enter a search query to show results.';

// actions dropdown window
const authorityActionsDropDownMenu = DropdownMenu();
const buttonExportSelected = authorityActionsDropDownMenu.find(
  Button('Export selected records (CSV/MARC)'),
);
const buttonNew = authorityActionsDropDownMenu.find(Button('New'));
const marcAuthUpdatesCsvBtn = Button('MARC authority headings updates (CSV)');
const actionsMenuSortBySection = authorityActionsDropDownMenu.find(
  Section({ menuSectionLabel: 'Sort by' }),
);
const actionsMenuShowColumnsSection = authorityActionsDropDownMenu.find(
  Section({ menuSectionLabel: 'Show columns' }),
);
const sortBySelect = Select({ dataTestID: 'sort-by-selection' });
const saveCqlButton = authorityActionsDropDownMenu.find(Button('Save authorities CQL query'));
const saveUuidsButton = authorityActionsDropDownMenu.find(Button('Save authorities UUIDs'));
const actionsShowColumnsOptions = [
  'Authorized/Reference',
  'Type of heading',
  'Authority source',
  'Number of titles',
];
const sortOptions = ['Relevance', 'Authorized/Reference', 'Heading/Reference', 'Type of heading'];

// auth report modal
const authReportModal = Modal({ id: 'authorities-report-modal' });
const exportButton = authReportModal.find(Button('Export'));
const newAuthorityButton = Button({ id: 'dropdown-clickable-create-authority' });
const resetButton = Button('Reset all');
const selectField = Select({ id: 'textarea-authorities-search-qindex' });
const headingTypeAccordion = Accordion('Type of heading');
const nextButton = Button({ id: 'authority-result-list-next-paging-button' });
const previousButton = Button({ id: 'authority-result-list-prev-paging-button' });
const searchNav = Button({ id: 'segment-navigation-search' });
const buttonLink = Button('Link');
const linkIconButton = Button({ ariaLabel: 'Link' });
const buttonAdvancedSearch = Button('Advanced search');
const modalAdvancedSearch = Modal('Advanced search');
const buttonSearchInAdvancedModal = Button({ ariaLabel: 'Search' });
const buttonResetAllInAdvancedModal = Button({ ariaLabel: 'Reset all' });
const buttonClose = Button({ icon: 'times' });
const checkBoxAllRecords = Checkbox({ ariaLabel: 'Select all records on this page' });
const openAuthSourceMenuButton = Button({ ariaLabel: 'open menu' });
const sourceFileAccordion = Section({ id: 'sourceFileId' });
const cancelButton = Button('Cancel');
const closeLinkAuthorityModal = Button({ ariaLabel: 'Dismiss modal' });
const exportSelectedRecords = Button('Export selected records (CSV/MARC)');
const accordionShared = Accordion('Shared');
const authoritySourceAccordion = Accordion({ id: 'sourceFileId' });
const authoritySourceOptions = [
  'LC Name Authority file (LCNAF)',
  'LC Subject Headings (LCSH)',
  "LC Children's Subject Headings",
  'LC Genre/Form Terms (LCGFT)',
  'LC Demographic Group Terms (LCDGT)',
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
const sharedTextInDetailView = 'Shared • ';
const localTextInDetailView = 'Local • ';
const defaultLDR = '00000nz\\\\a2200000o\\\\4500';
const valid008FieldValues = {
  'Cat Rules': 'c',
  'Geo Subd': 'n',
  'Govt Ag': '|',
  'Kind rec': 'a',
  Lang: '\\',
  'Level Est': 'a',
  'Main use': 'a',
  'Mod Rec': '\\',
  'Numb Series': 'n',
  'Pers Name': 'a',
  RecUpd: 'a',
  RefEval: 'a',
  Roman: '|',
  'SH Sys': 'a',
  Series: 'n',
  'Series use': 'a',
  Source: '\\',
  'Subj use': 'a',
  'Type Subd': 'n',
  Undef_18: '\\\\\\\\\\\\\\\\\\\\',
  Undef_30: '\\',
  Undef_34: '\\\\\\\\',
};
const resultsPaneHeader = PaneHeader('MARC authority');
const resultsListColumns = [
  'Authorized/Reference',
  'Heading/Reference',
  'Type of heading',
  'Authority source',
  'Number of titles',
];
const clearFieldIcon = Button({ icon: 'times-circle-solid' });
const searchToggleButton = Button({ id: 'segment-navigation-search' });
const browseToggleButton = Button({ id: 'segment-navigation-browse' });

export default {
  valid008FieldValues,

  waitLoading() {
    cy.expect(resultsPaneHeader.exists());
  },
  clickNewAuthorityButton() {
    cy.do(newAuthorityButton.click());
    QuickMarcEditorWindow.waitLoading();
  },
  clickActionsAndNewAuthorityButton() {
    cy.do([actionsButton.click(), newAuthorityButton.click()]);
    QuickMarcEditorWindow.waitLoading();
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

  verifyAuthorityFileName(actualName) {
    // valid name example: QuickInstanceExport2021-12-24T14_05_53+03_00.csv
    const expectedFileNameMask =
      /QuickAuthorityExport\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(
      FileManager.getFileNameFromFilePath(actualName),
    );
    DateTools.verifyDate(actualDate);
  },

  verifyContentOfExportFile(actual, ...expectedArray) {
    expectedArray.forEach((expectedItem) => expect(actual).to.include(expectedItem));
  },

  verifyContentOfHeadingsUpdateReportParsed(
    actual,
    rowIndex = 1,
    originalHeading,
    newHeading,
    identifier,
    expectedLinkedCount,
  ) {
    const clean = actual.trim();
    const lines = clean.split(/\r?\n/);
    const parseCsvLine = (line) => {
      const regex = /("([^"]|"")*"|[^,]*)/g;
      return line
        .match(regex)
        .filter((cell) => cell.length > 0 && cell !== ',')
        .map((cell) => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const headers = parseCsvLine(lines[0]);
    const values = parseCsvLine(lines[rowIndex]);

    const record = {};
    headers.forEach((header, i) => {
      record[header] = values[i] ?? '';
    });
    expect(record['Original heading']).to.include(originalHeading);
    expect(record['New heading']).to.include(newHeading);
    // eslint-disable-next-line dot-notation
    expect(record['Identifier']).to.include(identifier);
    expect(record['Number of bibliographic records linked']).to.eq(expectedLinkedCount);
  },

  select: (specialInternalId) => cy.do(authoritiesList.find(Button({ href: including(specialInternalId) })).click()),

  selectFirst: (title) => cy.do(MultiColumnListRow({ index: 0 }).find(Button(title)).click()),

  selectFirstRecord: () => cy.do(MultiColumnListRow({ index: 0 }).find(Button()).click()),

  selectAuthorityById(specialInternalId) {
    cy.do(authoritiesList.find(Button({ href: including(specialInternalId) })).click());
  },

  selectTitle: (title) => cy.do(Button(title).click()),

  selectIncludingTitle: (title) => cy.do(Button(including(title)).click()),

  selectItem: (item, partName = true) => {
    cy.expect(MultiColumnListCell({ content: item }).exists());
    if (partName) {
      cy.do(Button(including(item)).click());
    } else {
      cy.do(Button(item).click());
    }
  },

  clickOnNumberOfTitlesLink(columnIndex, linkValue) {
    cy.do(
      MultiColumnListCell({ columnIndex, content: linkValue })
        .find(Link())
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
  },

  verifyNumberOfTitles(columnIndex, linkValue) {
    cy.expect(MultiColumnListCell({ columnIndex, content: linkValue }).find(Link()).exists());
  },

  verifyNumberOfTitlesForRowWithValue(value, itemCount) {
    cy.expect(
      MultiColumnListRow({
        isContainer: true,
        content: including(value),
      })
        .find(MultiColumnListCell({ column: 'Number of titles' }))
        .has({ content: itemCount.toString() }),
    );
  },

  clickNumberOfTitlesByHeading(heading) {
    cy.do(
      MultiColumnListRow({
        isContainer: true,
        content: including(heading),
      })
        .find(MultiColumnListCell({ column: 'Number of titles' }))
        .find(Link())
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
  },

  verifyEmptyNumberOfTitlesForRowWithValue(value) {
    cy.expect(
      MultiColumnListRow({
        isContainer: true,
        content: including(value),
      })
        .find(MultiColumnListCell({ column: 'Number of titles' }))
        .has({ content: '' }),
    );
  },

  clickOnNumberOfTitlesForRowWithValue(value, itemCount) {
    cy.do(
      MultiColumnListRow({
        isContainer: true,
        content: including(value),
      })
        .find(MultiColumnListCell({ column: 'Number of titles', content: itemCount.toString() }))
        .find(Link())
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
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

  verifyLDRFieldSavedSuccessfully(
    successMsg,
    statusDropdownValue,
    typeDropdownValue,
    elvlDropdownValue,
    punctDropdownValue,
  ) {
    const position05 = statusDropdownValue.substring(0, 1);
    const position06 = typeDropdownValue.substring(0, 1);
    const position17 = elvlDropdownValue.substring(0, 1);
    const position18 =
      punctDropdownValue.substring(0, 1) === '\\' ? ' ' : punctDropdownValue.substring(0, 1);

    cy.expect([
      Callout(successMsg).exists(),
      marcViewSectionContent.has({
        text: including(
          `LEADER 03891${position05}${position06}  a2200505${position17}${position18} 4500`,
        ),
      }),
    ]);
  },

  checkRow: (expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),

  checkRowsCount: (expectedRowsCount) => {
    cy.expect(authoritiesList.has({ rowCount: expectedRowsCount }));
  },

  checkRowsCountExistance: (expectedRowsCount) => {
    cy.expect([
      authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount - 1 })).exists(),
    ]);
  },

  checkRowUpdatedAndHighlighted: (expectedHeadingReference) => cy.expect(
    authoritiesList
      .find(MultiColumnListCell({ selected: true }, including(expectedHeadingReference)))
      .exists(),
  ),

  switchToBrowse: () => cy.do(Button({ id: 'segment-navigation-browse' }).click()),

  checkDefaultBrowseOptions: (searchValue) => {
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id: 'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Select a browse option') }),
    ]);
  },

  searchBy: (parameter, value, isLongValue = false) => {
    cy.do(filtersSection.find(searchInput).selectIndex(parameter));
    cy.wait(1000);
    cy.do(filtersSection.find(searchInput).fillIn(value));
    if (isLongValue) {
      // need to wait until value will be applied in case when value is long
      cy.wait(1000);
    }
    cy.do(filtersSection.find(searchButton).click());
  },

  searchByParameter(searchOption, value) {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.expect(browseSearchAndFilterInput.has({ checkedOptionText: searchOption }));
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
        .find(Button({ text: including(value) }))
        .exists(),
    );
    cy.wait(1000);
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

  checkAuthorizedColumn(authorized) {
    cy.expect([MultiColumnListCell({ columnIndex: 1, content: authorized }).exists()]);
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

  verifyEmptySearchResults(value) {
    cy.expect(
      searchResults
        .find(HTML(`No results found for "${value}". Please check your spelling and filters.`))
        .exists(),
    );
  },

  clickNextPagination() {
    cy.do(rootSection.find(nextButton).click());
  },

  clickLinkButton() {
    cy.do(buttonLink.click());
  },

  clickLinkIcon() {
    cy.do(searchResults.find(linkIconButton).click());
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

  checkHeadlineInBoldExistsInMarkViewPaneContent(heading) {
    cy.expect(
      marcViewSectionContent
        .find(HTML({ className: including('font-weight-bold--'), text: heading }))
        .exists(),
    );
  },

  verifyViewPaneContent(value) {
    cy.expect([marcViewSection.exists(), marcViewSectionContent.has({ text: including(value) })]);
  },

  verifyViewPaneContentAbsent(value) {
    cy.expect([
      marcViewSection.exists(),
      marcViewSectionContent.find(HTML(including(value))).absent(),
    ]);
  },

  verifyViewPaneContentExists() {
    cy.expect(marcViewSection.exists());
  },

  getViewPaneContent() {
    cy.wrap(marcViewSectionContent.text()).as('viewAuthorityPaneContent');
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
      searchResults.find(HTML(including(emptyResultsMessage))).exists(),
    ]);
  },

  clickResetAndCheckBrowse: (searchValue) => {
    cy.do(filtersSection.find(resetButton).click());
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id: 'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Select a browse option') }),
      searchResults.find(HTML(including(emptyResultsMessage))).exists(),
    ]);
  },

  typeNotFullValueInMultiSelectFilterFieldAndCheck(
    accordionName,
    notFullValue,
    fullValue,
    isFound = true,
  ) {
    const multiSelect = Accordion(accordionName).find(MultiSelect());
    cy.do(multiSelect.fillIn(notFullValue));
    cy.wait(1000);
    if (isFound) {
      cy.expect(multiSelect.find(MultiSelectOption(including(fullValue))).absent());
    } else cy.expect(multiSelect.find(MultiSelectOption(including(fullValue))).absent());
  },

  chooseTypeOfHeading: (headingTypes) => {
    const headingTypesArray = Array.isArray(headingTypes) ? headingTypes : [headingTypes];
    cy.then(() => headingTypeAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(headingTypeAccordion.clickHeader());
      }
    });
    const multiSelect = headingTypeAccordion.find(MultiSelect());
    const matchers = headingTypesArray.map((value) => including(value));
    cy.do([multiSelect.open(), cy.wait(1000), multiSelect.select(matchers)]);
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
    const multiSelect = sourceFileAccordion.find(
      MultiSelect({ label: including('Authority source') }),
    );
    cy.wait(1000);
    cy.intercept('search/authorities/facets?*').as('getFacets');
    cy.do(multiSelect.select(including(option)));
    cy.wait('@getFacets');
    cy.wait(1000);
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

  verifyAbsenceOfSharedAccordion: () => {
    cy.expect(accordionShared.absent());
  },

  verifyExistanceOfSharedAccordion() {
    cy.expect(accordionShared.exists());
  },

  verifySharedAccordionOpen(isOpened) {
    cy.expect(accordionShared.has({ open: isOpened }));
  },

  clickAccordionByName(accordionName) {
    cy.do(Accordion(accordionName).clickHeader());
  },

  verifyCheckboxInAccordion(accordionName, checkboxValue, isChecked = null) {
    cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).exists());
    if (isChecked !== null) cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).has({ checked: isChecked }));
  },

  verifyFilterOptionCount(accordionName, optionName, expectedCount) {
    cy.expect(
      Accordion(accordionName)
        .find(
          HTML({ className: including('checkbox---'), text: `${optionName}\n${expectedCount}` }),
        )
        .exists(),
    );
  },

  actionsSortBy(value) {
    cy.do(sortBySelect.choose(value));
    // need to wait until content will be sorted
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
  },

  verifyActionsSortedBy(value) {
    cy.expect(sortBySelect.has({ checkedOptionText: value }));
  },

  actionsSelectCheckbox(value) {
    cy.do(Checkbox(value).click());
  },

  downloadSelectedRecordWithRowIdx(checkBoxNumber = 0) {
    cy.do(MultiColumnListRow({ index: checkBoxNumber }).find(checkboxSeletAuthorityRecord).click());
    cy.do([actionsButton.click(), exportSelectedRecords.click()]);
  },

  checkSelectAuthorityRecordCheckbox(recordTitle) {
    cy.do(
      ListRow({ content: including(recordTitle) })
        .find(checkboxSeletAuthorityRecord)
        .click(),
    );
  },

  checkSelectAuthorityRecordCheckboxChecked(recordTitle, isChecked = true) {
    cy.expect(
      ListRow({ content: including(recordTitle) })
        .find(checkboxSeletAuthorityRecord)
        .has({ checked: isChecked }),
    );
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

  verifyExportSelectedRecordsButtonAbsent() {
    cy.expect(buttonExportSelected.absent());
  },

  verifyToastNotificationAfterExportAuthority() {
    const currentDate = DateTools.getFormattedDate({ date: new Date() });

    cy.expect(
      Callout({
        textContent: and(
          including(`QuickAuthorityExport${currentDate}`),
          including(
            "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
          ),
        ),
      }).exists(),
    );
  },

  getExportedCSVFileNameFromCallout() {
    const fileNamePattern = /QuickAuthorityExport\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/;

    return Callout({
      textContent: including('QuickAuthorityExport'),
    }).perform((element) => {
      const text = element.textContent || '';
      const fileNameMatch = text.match(fileNamePattern);

      if (!fileNameMatch) {
        throw new Error('File name not found in callout message.');
      }
      return fileNameMatch[0].replace(/:/g, '_');
    });
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
    cy.do([headingTypeAccordion.clickHeader(), typeOfHeadingSelect.select(including(headingType))]);
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
    cy.expect([modalAdvancedSearch.exists()]);
  },

  fillAdvancedSearchField(rowIndex, value, searchOption, booleanOption, matchOption) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).fillQuery(value));
    cy.do(AdvancedSearchRow({ index: rowIndex }).selectSearchOption(rowIndex, searchOption));
    if (booleanOption) cy.do(AdvancedSearchRow({ index: rowIndex }).selectBoolean(rowIndex, booleanOption));
    if (matchOption) cy.do(AdvancedSearchRow({ index: rowIndex }).selectMatchOption(rowIndex, matchOption));
  },

  focusOnAdvancedSearchField(rowIndex) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).find(TextArea()).focus());
  },

  verifyClearIconInAdvancedSearchField(rowIndex, shouldExist = true) {
    const targetIcon = AdvancedSearchRow({ index: rowIndex }).find(clearFieldIcon);
    if (shouldExist) cy.expect(targetIcon.exists());
    else cy.expect(targetIcon.absent());
  },

  clickClearIconInAdvancedSearchField(rowIndex) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).find(clearFieldIcon).click());
  },

  clickSearchButton() {
    cy.do(buttonSearchInAdvancedModal.click());
  },

  checkSearchInput(value) {
    cy.expect(searchInput.has({ value: including(value) }));
  },

  clickResetAllButtonInAdvSearchModal() {
    cy.do(modalAdvancedSearch.find(buttonResetAllInAdvancedModal).click());
  },

  checkResetAllButtonInAdvSearchModalEnabled(enabled = true) {
    cy.expect(modalAdvancedSearch.find(buttonResetAllInAdvancedModal).has({ disabled: !enabled }));
  },

  checkAdvancedSearchModalAbsence() {
    cy.expect(modalAdvancedSearch.absent());
  },

  checkAdvancedSearchModalFields: (
    row,
    value,
    searchOption,
    boolean,
    matchOption = 'Contains all',
  ) => {
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
      AdvancedSearchRow({ index: row })
        .find(Select({ label: 'Match option*' }))
        .has({ content: including(matchOption) }),
      modalAdvancedSearch.find(buttonSearchInAdvancedModal).is({ disabled: or(true, false) }),
      modalAdvancedSearch.find(buttonResetAllInAdvancedModal).is({ disabled: or(true, false) }),
      modalAdvancedSearch.find(buttonClose).exists(),
    ]);
    if (boolean) {
      cy.expect([
        AdvancedSearchRow({ index: row })
          .find(Select({ id: including('advanced-search-bool-') }))
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

  checkAuthoritySourceDropdownHasOption(optionName) {
    cy.expect(sourceFileAccordion.find(MultiSelectOption(including(optionName))).exists());
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
        .find(MultiSelectOption(including('LC Demographic Group Terms (LCDGT)')))
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

  checkAuthoritySourceOptionsInPlugInModal() {
    cy.do(sourceFileAccordion.find(openAuthSourceMenuButton).click());
    cy.expect([
      MultiSelectOption(including('LC Name Authority file (LCNAF)')).exists(),
      MultiSelectOption(including('LC Subject Headings (LCSH)')).exists(),
      MultiSelectOption(including("LC Children's Subject Headings")).exists(),
      MultiSelectOption(including('LC Genre/Form Terms (LCGFT)')).exists(),
      MultiSelectOption(including('LC Demographic Group Terms (LCDGT)')).exists(),
      MultiSelectOption(including('LC Medium of Performance Thesaurus for Music (LCMPT)')).exists(),
      MultiSelectOption(including('Faceted Application of Subject Terminology (FAST)')).exists(),
      MultiSelectOption(including('Medical Subject Headings (MeSH)')).exists(),
      MultiSelectOption(including('Thesaurus for Graphic Materials (TGM)')).exists(),
      MultiSelectOption(including('Rare Books and Manuscripts Section (RBMS)')).exists(),
      MultiSelectOption(including('Art & architecture thesaurus (AAT)')).exists(),
      MultiSelectOption(including('GSAFD Genre Terms (GSAFD)')).exists(),
      MultiSelectOption(including('Not specified')).exists(),
      MultiSelectOption({ innerHTML: including('class="totalRecordsLabel') }).exists(),
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

  checkSelectedAuthoritySourceInPlugInModal(option) {
    cy.expect(sourceFileAccordion.find(MultiSelect({ selected: including(option) })).exists());
  },

  closeAuthoritySourceOption() {
    cy.do(sourceFileAccordion.find(Button({ icon: 'times' })).click());
    cy.wait(1000);
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
  verifyNoHeadingsUpdatesDataViaAPI(startDate, endDate) {
    cy.getAuthorityHeadingsUpdatesViaAPI(startDate, endDate).then((updatesData) => {
      cy.expect(updatesData.length).to.be.equal(0);
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

  verifyResultRowContentSharedIcon(heading, isShared) {
    const sharedIconRow = MultiColumnListRow(including(heading), { isContainer: false }).find(
      MultiColumnListCell({ innerHTML: including('sharedIcon') }),
    );

    cy.expect(isShared ? sharedIconRow.exists() : sharedIconRow.absent());
  },

  verifyTextOfPaneHeaderMarcAuthority(text) {
    cy.expect(
      PaneHeader('MARC authority')
        .find(HTML(including(text)))
        .exists(),
    );
  },

  verifyTextOfPaneHeaderMarcAuthorityAbsent(text) {
    cy.expect(
      PaneHeader('MARC authority')
        .find(HTML(including(text)))
        .absent(),
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
        return res.body.authorities || [];
      });
  },

  checkValueResultsColumn: (columnIndex, value) => {
    cy.expect([
      rootSection.exists(),
      MultiColumnListCell({ columnIndex, content: value }).exists(),
    ]);
  },

  checkMarcViewSectionIsVisible(isVisible) {
    cy.expect(marcViewSection.has({ visible: isVisible }));
  },

  checkDefaultSearchOptions: (searchValue) => {
    cy.expect([
      marcViewSection.absent(),
      SearchField({ id: 'textarea-authorities-search', value: searchValue }).absent(),
      selectField.has({ content: including('Keyword') }),
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

  clickMultiSelectToggleButtonInAccordion(accordionName) {
    cy.do(
      Accordion(accordionName)
        .find(Button({ className: including('multiSelectToggleButton') }))
        .click(),
    );
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

  checkBrowseReturnsRecordsAsExactMatchInAuthorityModal(recordTitle, numberOfRecord, recordType) {
    cy.get(
      `div[class^="mclRowContainer--"] [data-row-index]:has(button:contains("${recordTitle}"))`,
    )
      // check number of found records
      .should('have.length', numberOfRecord)
      .each(($row) => {
        // check Reference type
        cy.wrap($row).contains(recordType);
        // check that the record heading is bold (has a class containing the value 'anchorLink-')
        cy.get($row)
          .find('button[class*= link]')
          .invoke('attr', 'class')
          .should('match', /anchorLink-/);
      });
  },

  checkBrowseReturnsRecordsAsExactMatch(recordTitle, numberOfRecord, recordType) {
    cy.get(`div[class^="mclRowContainer--"] [data-row-index]:has(a:contains("${recordTitle}"))`)
      // check number of found records
      .should('have.length', numberOfRecord)
      .each(($row) => {
        // check Reference type
        cy.wrap($row).contains(recordType);
        // check that the record heading is bold (has a class containing the value 'anchorLink-')
        cy.get($row)
          .find('a[class*= root-]')
          .invoke('attr', 'class')
          .should('match', /anchorLink-/);
      });
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

  checkTotalRecordsForOptionInPlugInModal(option, totalRecords) {
    cy.do(sourceFileAccordion.find(openAuthSourceMenuButton).click());
    cy.expect(MultiSelectOption(including(option)).has({ totalRecords }));
  },

  verifyColumnValuesOnlyExist({ column, expectedValues, browsePane = false } = {}) {
    let actualValues = [];

    cy.then(() => authoritiesList.rowCount())
      .then((rowsCount) => {
        Array.from({ length: rowsCount }).forEach((_, index) => {
          authoritiesList
            .find(MultiColumnListCell({ column, row: index }))
            .content()
            .then((content) => {
              actualValues.push(content);
            });
        });
      })
      .then(() => {
        if (browsePane && actualValues.includes('')) {
          actualValues = actualValues
            .slice(0, actualValues.indexOf(''))
            .concat(actualValues.slice(actualValues.indexOf('') + 1));
        }
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

  verifyMarcViewPaneIsOpened(isOpened = true) {
    if (isOpened) {
      marcViewSection.exists();
    } else {
      marcViewSection.absent();
    }
  },

  checkSearchInputInFocus() {
    cy.expect(TextArea({ id: 'textarea-authorities-search' }).has({ focused: true }));
  },

  checkResetAllButtonDisabled(isDisabled = true) {
    cy.expect(resetButton.is({ disabled: isDisabled }));
  },

  verifyAllAuthorizedAreBold() {
    const actualValues = [];

    cy.then(() => authoritiesList.rowCount())
      .then((rowsCount) => {
        for (let i = 0; i < rowsCount; i++) {
          actualValues[i] = {};

          cy.wrap(i).then((index) => {
            const cellContent = MultiColumnListCell({ column: 'Authorized/Reference', row: index });

            cy.wrap(authoritiesList.find(cellContent).content()).then((content) => {
              actualValues[index].content = content;
            });

            cy.wrap(authoritiesList.find(cellContent).boldText()).then((bold) => {
              actualValues[index].bold = bold;
            });
          });
        }
      })
      .then(() => {
        const isValuesBold = actualValues
          .filter((obj) => obj.content === 'Authorized')
          .every((obj) => obj.bold === 'Authorized');
        expect(isValuesBold).to.equal(true);
      });
  },

  verifyAllAuthorizedHaveLinks() {
    const actualValues = [];

    cy.then(() => authoritiesList.rowCount())
      .then((rowsCount) => {
        Array.from({ length: rowsCount }).forEach((_, index) => {
          actualValues[index] = {};

          const cellAuthorizedContent = MultiColumnListCell({
            column: 'Authorized/Reference',
            row: index,
          });
          const cellLinkContent = MultiColumnListCell({ column: 'Link', row: index });

          cy.wrap(authoritiesList.find(cellAuthorizedContent).content()).then((content) => {
            actualValues[index].content = content;
          });

          cy.wrap(authoritiesList.find(cellLinkContent).innerHTML()).then((text) => {
            actualValues[index].hasLink = text.includes('button');
          });
        });
      })
      .then(() => {
        const hasLinkForAuthorized = actualValues
          .filter((obj) => obj.content === 'Authorized')
          .every((obj) => obj.hasLink);

        const hasNoLinkForOthers = actualValues
          .filter((obj) => obj.content !== 'Authorized')
          .every((obj) => !obj.hasLink);

        expect(hasLinkForAuthorized).to.equal(true);
        expect(hasNoLinkForOthers).to.equal(true);
      });
  },

  verifyPagination() {
    cy.expect([
      previousButton.has({ disabled: or(true, false) }),
      nextButton.has({ disabled: or(true, false) }),
    ]);
    cy.then(() => authoritiesList.rowCount()).then((rowsCount) => {
      expect(rowsCount).to.lessThan(101);
    });
  },

  closeFindAuthorityModal() {
    cy.do(findAuthorityModal.find(buttonClose).click());
  },

  checkLinkButtonToolTipText(text) {
    cy.do(
      marcViewSection
        .find(Button({ ariaLabelledby: 'marc-authority-link-tooltip-text' }))
        .hoverMouse(),
    );
    cy.expect(Tooltip().has({ text }));
  },

  selectRecordByIndex(rowIndex) {
    cy.do(MultiColumnListCell({ row: rowIndex, columnIndex: 2 }).find(Button()).click());
  },

  checkRowByContent: (rowContent) => cy.expect(authoritiesList.find(MultiColumnListRow(including(rowContent))).exists()),

  checkRowAbsentByContent: (rowContent) => cy.expect(authoritiesList.find(MultiColumnListRow(including(rowContent))).absent()),

  selectSearchOptionInDropdown(searchOption) {
    cy.do(selectField.choose(searchOption));
  },

  checkSearchOptionsInDropdownInOrder() {
    cy.wrap(selectField.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(MARC_AUTHORITY_SEARCH_OPTIONS));
    });
  },

  checkBrowseOptionsInDropdownInOrder() {
    cy.wrap(selectField.optionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(MARC_AUTHORITY_BROWSE_OPTIONS));
    });
  },

  checkSelectOptionFieldContent(option) {
    cy.expect(selectField.has({ checkedOptionText: option }));
  },

  checkRecordInBold(heading) {
    cy.expect(
      MultiColumnListCell(including(heading)).has({ innerHTML: including('anchorLink--') }),
    );
  },

  searchButtonClick() {
    cy.do(searchButton.click());
  },

  checkRecordsResultListIsAbsent() {
    cy.expect(
      rootSection
        .find(HTML(including('Choose a filter or enter a search query to show results')))
        .exists(),
    );
  },

  checkRecordsCountExistsInSharedFacet() {
    this.getRecordsCountInOptionsInSharedFacet('Yes').then((count) => {
      // eslint-disable-next-line no-unused-expressions
      cy.expect(count).to.exist;
    });
    this.getRecordsCountInOptionsInSharedFacet('No').then((count) => {
      // eslint-disable-next-line no-unused-expressions
      cy.expect(count).to.exist;
    });
  },

  getRecordsCountInOptionsInSharedFacet(optionName) {
    return cy.then(() => {
      return accordionShared
        .find(Checkbox({ name: optionName }))
        .find(HTML({ className: including('checkBoxLabelInfo--') }))
        .perform((element) => element.textContent);
    });
  },

  checkTypeOfHeadingFacetCleared() {
    cy.expect(typeOfHeadingSelect.has({ selectedCount: 0 }));
  },

  checkPreviousAndNextPaginationButtonsShown() {
    cy.expect([previousButton.visible(), nextButton.visible()]);
  },

  verifySharedIcon(row = 0) {
    cy.expect(
      rootSection.find(MultiColumnListCell({ row, innerHTML: including('sharedIcon') })).exists(),
    );
  },

  checkSharedTextInDetailView(isShared = true) {
    const expectedText = isShared ? sharedTextInDetailView : localTextInDetailView;
    cy.expect(detailsMarcViewPaneheader.has({ title: including(expectedText) }));
  },

  verifyAllResultsHaveSource(sourceNames) {
    this.getResultsListByColumn(4).then((cellTexts) => {
      cellTexts.forEach((cellText) => {
        expect(cellText).to.be.oneOf([...sourceNames]);
      });
    });
  },

  checkButtonNewExistsInActionDropdown(buttonShown = true) {
    if (buttonShown) cy.expect(buttonNew.exists());
    else cy.expect(buttonNew.absent());
  },

  checkAuthorityActionsDropDownExpanded() {
    cy.expect(authorityActionsDropDown.has({ open: true }));
  },

  createMarcAuthorityViaAPI(
    authorityFilePrefix,
    authorityFileHridStartsWith,
    fields,
    LDR = defaultLDR,
    tag008Values = valid008FieldValues,
  ) {
    return cy.createMarcAuthorityViaAPI(LDR, [
      { tag: '001', content: `${authorityFilePrefix}${authorityFileHridStartsWith}` },
      { tag: '008', content: tag008Values },
      ...fields,
    ]);
  },

  deleteViaAPI: (internalAuthorityId, ignoreErrors = false) => {
    cy.okapiRequest({
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
      path: `authority-storage/authorities/${internalAuthorityId}`,
      failOnStatusCode: !ignoreErrors,
    });
  },

  deleteMarcAuthorityByTitleViaAPI(title, authRefType = 'Authorized') {
    this.getMarcAuthoritiesViaApi({ limit: 100, query: `keyword="${title}"` }).then((records) => {
      if (records && records.length > 0) {
        records.forEach((record) => {
          if (record.authRefType === authRefType) {
            this.deleteViaAPI(record.id, true);
          }
        });
      }
    });
  },

  createMarcAuthorityRecordViaApiByReadingFromMrkFile(
    mrkFileName,
    field008Values = valid008FieldValues,
  ) {
    return new Promise((resolve) => {
      FileManager.readFile(`cypress/fixtures/${mrkFileName}`).then((fileContent) => {
        const parsedFromMrkFileFields = parseMrkFile(fileContent);
        const tag008 = {
          // 008 field values
          tag: '008',
          content: field008Values,
        };
        // add to the array of fields 008 field values
        parsedFromMrkFileFields.fields.unshift(tag008);

        cy.createMarcAuthorityViaAPI(
          parsedFromMrkFileFields.leader,
          parsedFromMrkFileFields.fields,
        ).then((createdMarcAuthorityId) => {
          resolve(createdMarcAuthorityId);
        });
      });
    });
  },

  setAuthoritySourceFileActivityViaAPI(sourceFileName, isActive = true) {
    cy.getAuthoritySourceFileDataViaAPI(sourceFileName).then(({ id, _version, selectable }) => {
      if (isActive !== selectable) {
        cy.setActiveAuthoritySourceFileViaAPI(id, _version, isActive);
      }
    });
  },

  closeAdvSearchModal() {
    cy.do(modalAdvancedSearch.find(Button({ icon: 'times' })).click());
    cy.expect(modalAdvancedSearch.absent());
  },

  verifyActionsMenu(saveUuidsEnabled = false, saveCqlEnabled = false, sortOption = sortOptions[0]) {
    cy.expect([
      saveUuidsButton.is({ disabled: !saveUuidsEnabled }),
      saveCqlButton.is({ disabled: !saveCqlEnabled }),
      actionsMenuSortBySection.find(sortBySelect).has({ checkedOptionText: sortOption }),
      sortBySelect.has({ content: sortOptions.join('') }),
    ]);
    actionsShowColumnsOptions.forEach((option) => {
      actionsMenuShowColumnsSection.find(Checkbox(option)).exists();
    });
  },

  clickSaveCqlButton() {
    cy.do(saveCqlButton.click());
    cy.wait(5000);
  },

  verifyResultsPane() {
    cy.expect([
      resultsPaneHeader.has({ subtitle: matching(/\d+ records? found/) }),
      actionsButton.exists(),
    ]);
    resultsListColumns.forEach((column, index) => {
      if (index < 3) rootSection.find(MultiColumnListHeader(column)).is({ sortable: true });
      else rootSection.find(MultiColumnListHeader(column)).is({ sortable: false });
    });
  },

  toggleAuthorityLccnValidationRule({ enable = true }) {
    cy.getSpecificationIds({ family: 'MARC' }).then((specs) => {
      // Find the specification with profile 'authority'
      const authoritySpecId = specs.find((spec) => spec.profile === 'authority').id;
      cy.getSpecificationRules(authoritySpecId).then(({ body }) => {
        const lccnRuleId = body.rules.find(
          (rule) => rule.name === 'Invalid LCCN Subfield Value',
        ).id;
        cy.updateSpecificationRule(authoritySpecId, lccnRuleId, {
          enabled: enable,
        });
      });
    });
  },

  checkSearchQuery(searchQuery) {
    cy.expect(SearchField({ id: 'textarea-authorities-search', value: searchQuery }).exists());
  },

  verifyMultiselectFilterOptionsCount(accordionName, expectedCount) {
    cy.expect(Accordion(accordionName).find(MultiSelect()).has({ optionsCount: expectedCount }));
  },

  verifyMultiselectFilterOptionExists(accordionName, optionName) {
    const optionRegExp = new RegExp(
      `${optionName.replace(/[\\(\\)]/g, (match) => `\\${match}`)}\\(\\d+\\)`,
    );
    cy.expect(
      Accordion(accordionName)
        .find(MultiSelectOption(matching(optionRegExp), { visible: or(true, false) }))
        .exists(),
    );
  },

  verifyRecordFound(heading, isFound = true) {
    const targetCell = searchResults.find(
      MultiColumnListCell({ columnIndex: 2, content: heading }),
    );
    if (isFound) cy.expect(targetCell.exists());
    else cy.expect(targetCell.absent());
  },

  verifySearchTabIsOpened() {
    cy.do(
      searchToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  verifyBrowseTabIsOpened() {
    cy.do(
      browseToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  clickNextPaginationButtonIfEnabled() {
    return cy
      .then(() => {
        return Button({
          id: 'authority-result-list-next-paging-button',
          disabled: or(true, false),
        }).disabled();
      })
      .then((isDisabled) => {
        if (!isDisabled) {
          cy.do(nextButton.click());
        }
        return cy.wrap(!isDisabled);
      });
  },
};
