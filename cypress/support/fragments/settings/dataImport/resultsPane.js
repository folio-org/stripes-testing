import {
  Button,
  Form,
  HTML,
  MultiColumnListCell,
  Section,
  TextField,
  including,
  not,
} from '../../../../../interactors';
import ArrayUtils from '../../../utils/arrays';

const resultsPane = Section({ id: 'pane-results' });
const actionsButton = resultsPane.find(Button('Actions'));

const searchForm = resultsPane.find(Form({ testId: 'search-form' }));
const searchInput = searchForm.find(TextField({ type: 'search' }));
const searchButton = searchForm.find(Button('Search'));

const searchResults = resultsPane.find(HTML({ className: including('searchResults-') }));
const noResultsText = 'The list contains no items';

export default {
  waitLoading() {
    cy.expect(resultsPane.exists());
  },
  expandActionsDropdown() {
    cy.do(actionsButton.click());
  },
  searchByName(name) {
    cy.do([searchInput.fillIn(name), searchButton.click()]);
    cy.wait(300);
  },
  checkResultsPaneIsEmpty({ isEmpty = true } = {}) {
    if (isEmpty) cy.expect(searchResults.has({ text: noResultsText }));
    else {
      cy.expect([
        searchResults.has({ text: not(including(noResultsText)) }),
        searchResults.find(MultiColumnListCell()).exists(),
      ]);
    }
  },

  clearSearchField() {
    cy.do(searchInput.clear());
    cy.expect(searchInput.has({ value: '' }));
  },

  // The profiles lists are sorted by the backend ("sortBy name"), so the order is compared the
  // same way (see normalizeLikeBackendSort); the first out-of-order names are shown on failure
  verifyProfilesIsSortedInAlphabeticalOrder() {
    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .then(($rows) => {
        const names = [...$rows].map(
          (row) => row.querySelector('[class*="mclCell-"]:nth-child(1)')?.textContent ?? '',
        );
        const outOfOrder = ArrayUtils.getOutOfOrderPairs({
          array: names,
          normalize: ArrayUtils.normalizeLikeBackendSort,
        });
        const details = outOfOrder
          .slice(0, 5)
          .map(({ index, previous, current }) => `[${index}] "${previous}" > "${current}"`)
          .join('; ');

        cy.expect(
          outOfOrder.length,
          `${names.length} profiles should be sorted alphabetically. Out of order: ${details}`,
        ).to.equal(0);
      });
  },
};
