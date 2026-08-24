import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  TextField,
  including,
  SearchField,
  TextArea,
} from '../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  ORDER_LINE_FILTER_LABELS,
  RESULTS_PANE_NOT_FOUND_MESSAGE,
} from '../../constants';
import DateTools from '../../utils/dateTools';
import FiltersPaneHelper from '../filtersPane';
import MultiColumnListHelper from '../multiColumnList';
import SelectLocationModal from '../orders/modals/selectLocationModal';

const LOCATIONS_LOOKUP_TRIGGER = 'Location look-up';

const claimingPane = Pane('Claiming');
const filtersPane = Pane({ id: 'claiming-filters-pane' });
const actionsButton = Button('Actions');
const claimingList = MultiColumnList({ id: 'claiming-list' });
const sendClaimModal = Modal(including('Send claim'));
const searchField = SearchField();
const claimingDateField = TextField({ name: including('claimingDate') });
const internalNoteField = TextArea('Internal note');
const externalNoteField = TextArea('External note');
const cancelButton = Button(COMMON_BUTTON_LABELS.CANCEL);
const saveAndCloseButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE);

export default {
  waitLoading() {
    cy.expect([claimingPane.exists()]);
    cy.wait(2000);
  },

  expandActionsDropdown() {
    cy.do(claimingPane.find(PaneHeader()).find(actionsButton).click());
  },

  selectPieceByRowIndex(rowIndex = 0) {
    cy.do(
      claimingList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Checkbox())
        .click(),
    );
  },

  clickActionsButton() {
    cy.do(claimingPane.find(PaneHeader()).find(actionsButton).click());
  },

  clickSendClaimOption() {
    cy.do(Button('Send claim').click());
  },

  fillClaimExpiryDate(date) {
    cy.do(sendClaimModal.find(claimingDateField).fillIn(date));
  },

  clickSaveAndCloseInSendClaimModal() {
    cy.do(sendClaimModal.find(saveAndCloseButton).click());
    cy.expect(sendClaimModal.absent());
  },

  sendClaim() {
    const futureDate = DateTools.getFutureWeekDateObj();
    const formattedDate = DateTools.getFormattedDate({ date: futureDate }, 'MM/DD/YYYY');

    this.clickActionsButton();
    this.clickSendClaimOption();
    this.fillClaimExpiryDate(formattedDate);
    this.clickSaveAndCloseInSendClaimModal();
  },

  searchByTitle(title) {
    cy.do([searchField.fillIn(title), Button(COMMON_BUTTON_LABELS.SEARCH).click()]);
    cy.wait(2000);
  },

  searchByParameter(parameter, value) {
    cy.do([
      searchField.selectIndex(parameter),
      searchField.fillIn(value),
      Button(COMMON_BUTTON_LABELS.SEARCH).click(),
    ]);
  },

  selectSearchIndex(parameter) {
    cy.do(searchField.selectIndex(parameter));
    cy.expect(searchField.has({ selectedFilterText: parameter }));
  },

  assertSearchFieldValue(value) {
    cy.expect(searchField.has({ value }));
  },

  clickSearchButton() {
    cy.do(Button(COMMON_BUTTON_LABELS.SEARCH).click());
  },

  // The search field is rendered inside a form, so Enter submits the search.
  pressEnterInSearchField() {
    cy.get('#claiming-filters-pane-content').find('#input-record-search').type('{enter}');
  },

  sortResultsBy(columnName) {
    MultiColumnListHelper.sortListBy(claimingList, columnName);
  },

  selectResultsRecords(rowIndexes) {
    rowIndexes.forEach((index) => {
      const checkbox = claimingList
        .find(MultiColumnListRow({ indexRow: `row-${index}` }))
        .find(Checkbox());

      cy.expect(checkbox.has({ disabled: false }));
      cy.do(checkbox.click());
    });
  },

  assertResetAllButtonState({ disabled }) {
    FiltersPaneHelper.assertResetAllButtonState(filtersPane, { disabled });
  },

  clearSearchField() {
    cy.get('#claiming-filters-pane-content').find('#input-record-search').clear();
  },

  clearAllFilters() {
    FiltersPaneHelper.clearAllFilters(filtersPane);
    this.assertResetAllButtonState({ disabled: true });
  },

  clearFilter(filterLabel) {
    FiltersPaneHelper.clearFilter(filtersPane, filterLabel);
  },

  filterByMultiSelectOptions(filterLabel, options) {
    FiltersPaneHelper.filterByMultiSelectOptions(filtersPane, filterLabel, options);
  },

  filterByCheckboxes(filterLabel, values, options) {
    FiltersPaneHelper.filterByCheckboxes(filtersPane, filterLabel, values, options);
  },

  filterByTags(tags = []) {
    this.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, tags);
  },

  selectLocationInFilters(locationName, options = {}) {
    FiltersPaneHelper.expandFilterAccordion(filtersPane, ORDER_LINE_FILTER_LABELS.LOCATION);
    cy.do(filtersPane.find(Button(LOCATIONS_LOOKUP_TRIGGER)).click());
    SelectLocationModal.waitLoading();
    SelectLocationModal.selectLocation(locationName, { multiselect: true, ...options });
  },

  selectMultipleLocationsInFilters(locationNames) {
    FiltersPaneHelper.expandFilterAccordion(filtersPane, ORDER_LINE_FILTER_LABELS.LOCATION);
    cy.do(filtersPane.find(Button(LOCATIONS_LOOKUP_TRIGGER)).click());
    SelectLocationModal.waitLoading();
    SelectLocationModal.selectMultipleLocations(locationNames);
  },

  /* Assertions */

  assertClaimingResults(rowsConfig) {
    cy.expect(claimingList.exists());
    MultiColumnListHelper.waitLoadingComplete(claimingList);
    MultiColumnListHelper.assertRowsCellsContent(claimingList, rowsConfig);
    MultiColumnListHelper.assertRowCount(claimingList, rowsConfig.length);
  },

  assertCheckboxFilterValues: FiltersPaneHelper.buildCheckboxFilterValuesAssertion(filtersPane),

  assertMultiSelectFilterValues:
    FiltersPaneHelper.buildMultiSelectFilterValuesAssertion(filtersPane),

  verifyPiecesWithTitleDisplayed(title, expectedCount) {
    cy.expect(claimingList.find(HTML(including(title))).exists());
    cy.then(() => claimingList.rowCount()).then((actualCount) => {
      expect(actualCount).to.equal(
        expectedCount,
        `Expected ${expectedCount} pieces after searching for "${title}", but found ${actualCount}`,
      );
    });
  },

  assertPiecesWithTitlesDisplayed(titles = []) {
    if (!titles.length) {
      cy.expect(claimingPane.find(HTML(including('No results found'))).exists());
      return;
    }
    titles.forEach((title) => {
      cy.expect(claimingList.find(HTML(including(title))).exists());
    });
    MultiColumnListHelper.assertRowCount(claimingList, titles.length);
  },

  verifyMessageDisplayed(message) {
    cy.expect(claimingPane.find(HTML(message)).exists());
  },

  verifyPiecesCount(count) {
    const recordText = count === 1 ? 'record found' : 'records found';
    cy.expect(claimingPane.find(HTML(including(`${count} ${recordText}`))).exists());
  },

  checkActionsMenuOptionExists(optionName, exists = true) {
    if (exists) {
      cy.expect(Button(optionName).exists());
    } else {
      cy.expect(Button(optionName).absent());
    }
  },

  checkClaimingPaneIsDisplayed() {
    cy.expect(claimingPane.exists());
  },

  assertPiecesCountToClaim(expectedCount) {
    const rules = new Intl.PluralRules();
    const formatted = new Map([
      ['one', 'piece'],
      ['other', 'pieces'],
    ]).get(rules.select(expectedCount));
    const message = `Claim ${expectedCount} ${formatted}?`;

    cy.expect(sendClaimModal.find(HTML(including(message))).exists());
  },

  assertSendClaimModalElements({ count }) {
    this.assertPiecesCountToClaim(count);
    cy.expect([
      claimingDateField.has({ required: true }),
      internalNoteField.exists(),
      externalNoteField.exists(),
      cancelButton.exists(),
      saveAndCloseButton.exists(),
    ]);
  },

  assertNoResultsFound() {
    cy.expect(claimingPane.find(HTML(RESULTS_PANE_NOT_FOUND_MESSAGE)).exists());
  },

  /*  */

  interceptGetClaimingPieces() {
    return cy.intercept('GET', '/orders/wrapper-pieces*').as('getClaimingPieces');
  },

  waitForGetClaimingPiecesQueryCompleted() {
    return cy.wait('@getClaimingPieces');
  },
};
