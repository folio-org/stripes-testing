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
import { COMMON_BUTTON_LABELS, RESULTS_PANE_NOT_FOUND_MESSAGE } from '../../constants';
import DateTools from '../../utils/dateTools';
import FiltersPaneHelper from '../filtersPane';
import MultiColumnListHelper from '../multiColumnList';

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
    cy.do([searchField.fillIn(title), Button('Search').click()]);
    cy.wait(2000);
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

  clearFilter(filterLabel) {
    FiltersPaneHelper.clearFilter(filtersPane, filterLabel);
  },

  filterByMultiSelectOptions(filterLabel, options) {
    FiltersPaneHelper.filterByMultiSelectOptions(filtersPane, filterLabel, options);
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
