/* eslint-disable no-dupe-keys */
import { including } from '@interactors/html';
import {
  MultiColumnListCell,
  Pane,
  MultiColumnListRow,
  MultiColumnListHeader,
  PaneContent,
  Button,
} from '../../../../../interactors';

const browseInventoryPane = Pane('Browse inventory');
const inventoryPane = Pane('Inventory');
const searchFilterPane = Pane('Search & filter');
const paneIntanceDetails = PaneContent({ id: 'browse-inventory-results-pane-content' });

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
      MultiColumnListCell({ row: rowIndex, columnIndex: 1 }).has({ content: itemCount.toString() }),
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

  verifySearchResultsTable() {
    cy.expect([
      paneIntanceDetails.find(MultiColumnListHeader('Classification')).exists(),
      paneIntanceDetails.find(MultiColumnListHeader('Number of titles')).exists(),
    ]);
  },

  clickOnSearchResult: (value) => {
    cy.do(MultiColumnListCell({ content: including(value) }).click());
  },

  selectFoundValueByRow(rowIndex, value) {
    cy.do(MultiColumnListCell({ row: rowIndex, content: value }).find(Button()).click());
  },

  waitForClassificationNumberToAppear(
    classificationNumber,
    classificationBrowseId = 'all',
    isPresent = true,
  ) {
    return cy.recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: `browse/classification-numbers/${classificationBrowseId}/instances`,
          searchParams: {
            query: `(number>="${classificationNumber.replace(/"/g, '""')}")`,
          },
          isDefaultSearchParamsRequired: false,
        });
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
        limit: 12,
        delay: 5000,
        timeout: 60000,
        error: `Classification number did not appear: "${classificationNumber}"`,
      },
    );
  },
};
