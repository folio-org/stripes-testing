/* eslint-disable no-dupe-keys */
import { including } from '@interactors/html';
import {
  MultiColumnListCell,
  Pane,
  MultiColumnListRow,
  MultiColumnListHeader,
  PaneContent,
  Button,
  or,
} from '../../../../../interactors';

const browseInventoryPane = Pane('Browse inventory');
const inventoryPane = Pane('Inventory');
const searchFilterPane = Pane('Search & filter');
const paneIntanceDetails = PaneContent({ id: 'browse-inventory-results-pane-content' });
const nextButton = Button('Next', { disabled: or(true, false) });
const previousButton = Button('Previous', { disabled: or(true, false) });

export default {
  verifyBrowseInventoryPane() {
    cy.expect([browseInventoryPane.exists(), searchFilterPane.exists()]);
  },

  verifyInventoryPane() {
    cy.expect(inventoryPane.exists());
  },

  verifyRowExists(rowIndex) {
    cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}` }).exists());
  },

  verifyResultAndItsRow(rowIndex, value) {
    cy.expect(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` }).has({ content: including(value) }),
    );
  },

  verifyRowValueIsBold(rowNumber, value) {
    cy.expect(
      MultiColumnListCell({ row: rowNumber, columnIndex: 0 }).has({
        innerHTML: including(`<strong>${value}</strong>`),
      }),
    );
  },

  verifyNumberOfTitlesInRow(rowIndex, itemCount) {
    cy.expect(
      MultiColumnListCell({ row: rowIndex, column: 'Number of titles' }).has({
        content: itemCount.toString(),
      }),
    );
  },

  verifyValueInResultTableIsHighlighted(value) {
    cy.expect([
      MultiColumnListCell(`${value}`).has({ innerHTML: including(`<strong>${value}</strong>`) }),
    ]);
  },

  checkNumberOfTitlesInRow(callNumber, numberOfTitles) {
    cy.do(
      MultiColumnListCell(callNumber).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect(MultiColumnListCell(numberOfTitles, { row: rowNumber }).exists());
      }),
    );
  },

  verifySearchResultsTable(isShown = true) {
    if (isShown) {
      cy.expect([
        paneIntanceDetails.find(MultiColumnListHeader('Classification')).exists(),
        paneIntanceDetails.find(MultiColumnListHeader('Title')).exists(),
        paneIntanceDetails.find(MultiColumnListHeader('Contributors')).exists(),
        paneIntanceDetails.find(MultiColumnListHeader('Number of titles')).exists(),
      ]);
    } else {
      cy.expect([
        paneIntanceDetails.find(MultiColumnListHeader('Classification')).absent(),
        paneIntanceDetails.find(MultiColumnListHeader('Title')).absent(),
        paneIntanceDetails.find(MultiColumnListHeader('Contributors')).absent(),
        paneIntanceDetails.find(MultiColumnListHeader('Number of titles')).absent(),
      ]);
    }
  },

  clickOnSearchResult: (value) => {
    cy.do(MultiColumnListCell({ content: including(value) }).click());
  },

  selectFoundValueByRow(rowIndex, value) {
    cy.do(MultiColumnListCell({ row: rowIndex, content: value }).find(Button()).click());
  },

  selectFoundValueByValue(value) {
    cy.do(MultiColumnListCell({ content: value }).find(Button()).click());
  },

  getClassificationNumbersViaApi(classificationBrowseId = 'all', classificationNumber) {
    return cy.okapiRequest({
      method: 'GET',
      path: `browse/classification-numbers/${classificationBrowseId}/instances`,
      searchParams: {
        query: `(number>="${classificationNumber.replace(/"/g, '""')}")`,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  waitForClassificationNumberToAppear(
    classificationNumber,
    classificationBrowseId = 'all',
    isPresent = true,
  ) {
    return cy.recurse(
      () => {
        return this.getClassificationNumbersViaApi(classificationBrowseId, classificationNumber);
      },
      (response) => {
        const foundNumbers = response.body.items.filter((item) => {
          return item.classificationNumber === classificationNumber;
        });
        if (isPresent) {
          return foundNumbers.length > 0;
        } else {
          return foundNumbers.length === 0;
        }
      },
      {
        limit: 14,
        delay: 5000,
        timeout: 72000,
        error: `Classification number did not appear: "${classificationNumber}"`,
      },
    );
  },

  checkPaginationButtonsShown() {
    cy.expect([nextButton.exists(), previousButton.exists()]);
  },

  clickNextPaginationButton() {
    cy.do(nextButton.click());
    cy.wait(2000);
  },

  getNextPaginationButtonState() {
    return cy.wrap(nextButton.perform((el) => !el.disabled));
  },

  getPreviousPaginationButtonState() {
    return cy.wrap(previousButton.perform((el) => !el.disabled));
  },

  checkRowValues(
    classificationNumber,
    title = '',
    contributors = '',
    numberOfTitles = 1,
    isHighlighted = true,
  ) {
    const contentString = `${classificationNumber}${title}${contributors}${numberOfTitles}`;
    if (isHighlighted) {
      cy.expect(
        MultiColumnListRow({
          innerHTML: including(`<strong>${classificationNumber}</strong>`),
          content: contentString,
        }).exists(),
      );
    } else {
      cy.expect(
        MultiColumnListRow({
          content: contentString,
        }).exists(),
      );
    }
  },
};
