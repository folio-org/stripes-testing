import {
  Button,
  including,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Section,
} from '../../../../../interactors';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const browseButton = Button({ id: 'mode-navigation-browse' });
const instanceDetailsPane = Section({ id: 'pane-instancedetails' });
const resultList = MultiColumnList({ id: 'browse-results-list-callNumbers' });
const nextButton = Button({ id: including('-next-paging-button') });
const previousButton = Button({ id: including('-prev-paging-button') });
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });

export default {
  clickOnResult(searchQuery) {
    cy.do(
      MultiColumnListCell(`${searchQuery}`)
        .find(Button(`${searchQuery}`))
        .click(),
    );
  },

  checkExactSearchResult(searchQuery) {
    cy.do([MultiColumnListCell(`${searchQuery}`).has({ innerHTML: including(searchQuery) })]);
  },

  checkNonExactSearchResult(searchQuery) {
    cy.expect(MultiColumnListCell(including(`${searchQuery}would be here`)).exists());
  },

  checkItemSearchResult(callNumber, suffix) {
    cy.expect([
      MultiColumnListCell(`${callNumber}would be here`).has({
        content: including(`${callNumber}would be here`),
      }),
      MultiColumnListCell(`${callNumber} ${suffix}`).has({
        content: including(`${callNumber} ${suffix}`),
      }),
    ]);
  },

  checkSearchResultsTable() {
    cy.expect([
      MultiColumnListHeader({ id: 'list-column-callnumber' }).has({ content: 'Call number' }),
      MultiColumnListHeader({ id: 'list-column-title' }).has({ content: 'Title' }),
      MultiColumnListHeader({ id: 'list-column-numberoftitles' }).has({
        content: 'Number of titles',
      }),
    ]);
  },

  checkNotExistingCallNumber(callNumber) {
    cy.expect(
      MultiColumnListCell(`${callNumber}would be here`).has({
        content: including(`${callNumber}would be here`),
      }),
    );
  },

  checkNotClickableResult(searchQuery) {
    cy.expect(Button(searchQuery).absent());
  },

  selectFoundCallNumber(callNumber) {
    cy.do(Button(including(callNumber)).click());
    cy.expect(instanceDetailsPane.exists());
  },
  clickBrowseBtn() {
    cy.wait(1000);
    cy.do(browseButton.click());
  },
  valueInResultTableIsHighlighted(value) {
    cy.do([
      MultiColumnListCell(`${value}`).has({ innerHTML: including(`<strong>${value}</strong>`) }),
    ]);
  },
  resultRowsIsInRequiredOder(rows) {
    cy.do(
      MultiColumnListCell({ content: rows[0] }).perform((element) => {
        const rowNumber = parseInt(element.parentElement.getAttribute('data-row-inner'), 10);
        rows.forEach((el, i) => {
          cy.expect(MultiColumnListCell(el).has({ row: rowNumber + i }));
        });
      }),
    );
  },

  checkNumberOfTitlesForRow(callNumber, numberOfTitles) {
    cy.do(
      MultiColumnListCell(callNumber).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect(MultiColumnListCell(numberOfTitles, { row: rowNumber }).exists());
      }),
    );
  },

  verifyCallNumbersNotFound(callNumberArray) {
    InventorySearchAndFilter.checkSearchButtonEnabled();
    callNumberArray.forEach((callNumber) => {
      cy.expect(MultiColumnListCell(callNumber).absent());
    });
  },

  checkValueInRowAndColumnName(indexRow, columnName, value) {
    cy.expect(
      resultList
        .find(MultiColumnListCell({ row: indexRow, column: columnName }))
        .has({ content: value }),
    );
  },

  checkValuePresentInResults(value, isPresent = true) {
    if (isPresent) cy.expect(resultList.find(MultiColumnListCell(value)).exists());
    else cy.expect(resultList.find(MultiColumnListCell(value)).absent());
  },

  clickNextPaginationButton() {
    cy.do(inventorySearchResultsPane.find(nextButton).click());
  },

  clickPreviousPaginationButton() {
    cy.do(inventorySearchResultsPane.find(previousButton).click());
  },

  checkNextPaginationButtonActive(isActive = true) {
    cy.expect(nextButton.has({ disabled: !isActive }));
  },

  checkPreviousPaginationButtonActive(isActive = true) {
    cy.expect(previousButton.has({ disabled: !isActive }));
  },
};
