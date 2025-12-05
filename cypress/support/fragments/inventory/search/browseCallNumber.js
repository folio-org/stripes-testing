import {
  Button,
  including,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Section,
  Accordion,
  Checkbox,
} from '../../../../../interactors';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const browseButton = Button({ id: 'mode-navigation-browse' });
const instanceDetailsPane = Section({ id: 'pane-results' });
const resultList = MultiColumnList({ id: including('browse-results-list-') });
const nextButton = Button({ id: including('-next-paging-button') });
const previousButton = Button({ id: including('-prev-paging-button') });
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const sharedAccordion = Accordion({ id: 'callNumbersShared' });
const yesCheckbox = sharedAccordion.find(
  Checkbox({ id: 'clickable-filter-callNumbersShared-true' }),
);
const noCheckbox = sharedAccordion.find(
  Checkbox({ id: 'clickable-filter-callNumbersShared-false' }),
);
const sharedAccResetButton = sharedAccordion.find(Button({ className: including('iconButton-') }));

const SharedAccordion = {
  open() {
    cy.intercept('GET', 'search/call-numbers/facets*').as('getCallNumbersFacets');
    cy.get('#callNumbersShared')
      .find('[class^=content-region]')
      .invoke('attr', 'class')
      .then((className) => {
        if (!className.includes('expanded-')) {
          cy.do(sharedAccordion.clickHeader());
        }
      });
    return cy.wait('@getCallNumbersFacets').then((response) => {
      const sharedValues = response.response.body?.facets['instances.shared']?.values;
      return {
        shared: sharedValues.find((item) => item.id === 'true')?.totalRecords || 0,
        local: sharedValues.find((item) => item.id === 'false')?.totalRecords || 0,
      };
    });
  },

  byShared(condititon) {
    this.open();
    if (condititon === 'Yes') {
      cy.expect(yesCheckbox.exists());
      cy.do(yesCheckbox.click());
    } else {
      cy.expect(noCheckbox.exists());
      cy.do(noCheckbox.click());
    }
  },

  reset() {
    cy.expect(sharedAccResetButton.exists());
    cy.do(sharedAccResetButton.click());
  },
};

export default {
  SharedAccordion,
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
    for (let i = 0; i < rows.length - 1; i++) {
      cy.do(
        MultiColumnListCell({ content: rows[i] }).perform((element) => {
          cy.do(
            MultiColumnListCell({ content: rows[i + 1] }).perform((element2) => {
              const rowNumber1 = parseInt(element.parentElement.getAttribute('data-row-inner'), 10);
              const rowNumber2 = parseInt(
                element2.parentElement.getAttribute('data-row-inner'),
                10,
              );
              expect(rowNumber1).to.be.lessThan(rowNumber2);
            }),
          );
        }),
      );
    }
  },

  checkNumberOfTitlesForRow(callNumber, numberOfTitles) {
    cy.do(
      MultiColumnListCell(callNumber).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect(MultiColumnListCell(String(numberOfTitles), { row: rowNumber }).exists());
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

  getCallNumbersViaApi(typeCode, callNumberValue) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `browse/call-numbers/${typeCode}/instances`,
        searchParams: {
          query: `(fullCallNumber>="${callNumberValue}")`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.items);
  },

  waitForCallNumberToAppear(callNumber, isPresent = true, typeCode = 'all', numberOfTitles) {
    return cy.recurse(
      () => {
        return this.getCallNumbersViaApi(typeCode, callNumber);
      },
      (response) => {
        const foundCallNumbers = response.filter((item) => {
          return item.fullCallNumber === callNumber;
        });
        if (isPresent && numberOfTitles) {
          return foundCallNumbers[0].totalRecords === numberOfTitles && foundCallNumbers.length > 0;
        }
        return isPresent ? foundCallNumbers.length > 0 : foundCallNumbers.length === 0;
      },
      {
        limit: 15,
        delay: 5000,
        timeout: 70000,
      },
    );
  },

  checkValuePresentForRow(callNumber, columnIndex, value) {
    cy.do(
      MultiColumnListCell(callNumber).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect(MultiColumnListCell(value, { row: rowNumber, columnIndex }).exists());
      }),
    );
  },
};
