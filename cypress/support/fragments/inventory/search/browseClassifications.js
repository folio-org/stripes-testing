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
import InventorySearchAndFilter from '../inventorySearchAndFilter';
import ClassificationBrowseCapture from './classificationBrowseCapture';

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

  // Counts rows matching the given column values (Classification, Title, Contributors,
  // Number of titles) - only classificationNumber and expectedCount are required, the rest
  // are checked only when provided. For result tables where the same classification value
  // appears on several rows (e.g. same text, different identifier types),
  // verifyValueInResultTableIsHighlighted/checkRowValues only confirm at least one match
  // exists, which isn't enough to prove the expected row distribution.
  verifyRowsCount({
    classificationNumber,
    title,
    contributors,
    numberOfTitles,
    expectedCount,
    isHighlighted = true,
  }) {
    cy.expect(
      browseInventoryPane
        .find(MultiColumnListCell(`${classificationNumber}`), { columnIndex: 0 })
        .exists(),
    );
    cy.wait(2000);
    cy.get('#browse-inventory-results-pane-content div[class^="mclRow-"]').then(($rows) => {
      const matchingRows = [...$rows].filter((row) => {
        const cells = row.querySelectorAll('div[class*="mclCell-"]');
        const [classificationCell, titleCell, contributorsCell, numberOfTitlesCell] = cells;
        const isBold = Boolean(classificationCell?.querySelector('strong'));

        if (classificationCell?.textContent?.trim() !== classificationNumber) return false;
        if (isBold !== isHighlighted) return false;
        if (title !== undefined && titleCell?.textContent?.trim() !== title) return false;
        if (contributors !== undefined && contributorsCell?.textContent?.trim() !== contributors) {
          return false;
        }
        if (
          numberOfTitles !== undefined &&
          numberOfTitlesCell?.textContent?.trim() !== `${numberOfTitles}`
        ) {
          return false;
        }
        return true;
      });
      expect(matchingRows.length).to.equal(expectedCount);
    });
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

  // Waits until every {value, number} pair in expectedPairs is present via the API, with
  // totalRecords matching number - unlike waitForClassificationNumberToAppear (which only
  // waits for a value to exist at all), this confirms the full expected data set has finished
  // indexing before the UI is checked, avoiding a race where only some rows/counters are ready
  waitForClassificationNumberPairsToAppear(expectedPairs, classificationBrowseId = 'all') {
    const uniqueValues = [...new Set(expectedPairs.map(({ value }) => value))];

    return cy.recurse(
      () => uniqueValues.reduce(
        (chain, value) => chain.then((accumulatedItems) => this.getClassificationNumbersViaApi(classificationBrowseId, value).then((response) => accumulatedItems.concat(
          response.body.items.filter((item) => item.classificationNumber === value),
        ))),
        cy.wrap([]),
      ),
      (allItems) => {
        const actualCounts = allItems.map((item) => item.totalRecords).sort();
        const expectedCounts = expectedPairs.map(({ number }) => number).sort();
        return JSON.stringify(actualCounts) === JSON.stringify(expectedCounts);
      },
      {
        limit: 14,
        delay: 5000,
        timeout: 72000,
        error: 'Classification numbers did not fully appear with expected counts',
        // cy.recurse calls this on every attempt with the remaining attempt count in
        // `limit` - only log once we're on the last one and it still failed, so a normal
        // retry doesn't spam the log but a real failure shows what was actually returned
        log: (allItems, { successful, limit }) => {
          if (successful || limit > 1) return;
          const actualCounts = allItems.map((item) => item.totalRecords).sort();
          const expectedCounts = expectedPairs.map(({ number }) => number).sort();
          cy.log(
            `waitForClassificationNumberPairsToAppear gave up - expected counts ${JSON.stringify(expectedCounts)}, got ${JSON.stringify(actualCounts)}, items: ${JSON.stringify(allItems)}`,
          );
        },
      },
    );
  },

  // verifyRowsCount doesn't retry - it reads the DOM once. Register this before any action
  // that re-triggers a browse search (clicking Search, or changing/toggling a filter), then
  // pass the returned alias to waitForBrowseResultsToLoad to wait for that search's actual
  // response (not just the request firing) before reading rows, plus a short pause for the
  // list to re-render. A fresh alias is generated on every call so a late-resolving earlier
  // request can't be mistaken by cy.wait() for the one just triggered.
  classificationNumbersInterceptCount: 0,

  interceptClassificationNumbersApi() {
    this.classificationNumbersInterceptCount += 1;
    const alias = `getClassificationNumbersSearch${this.classificationNumbersInterceptCount}`;
    cy.intercept('GET', '**/browse/classification-numbers/*/instances**').as(alias);
    return alias;
  },

  // Redirect from browse to search uses the id of the clicked browse item
  // (query=(classificationId=="<id>")), which only the backend response knows.
  // Resolves that id for the clicked classification number, in order of preference:
  // 1) the captured browse response item at rowIndex (table row N maps to items[N]);
  // 2) the first captured item with the exact number (and typeId, if given);
  // 3) the browse API (same matching).
  getClassificationId(
    classificationNumber,
    { rowIndex, typeId, classificationBrowseId = 'all' } = {},
  ) {
    const isMatch = (item) => {
      return (
        item?.id &&
        item.classificationNumber === classificationNumber &&
        (!typeId || item.classificationTypeId === typeId)
      );
    };
    // deferred with cy.then so the captured items are read after the preceding browse commands ran
    return cy.then(() => {
      const captured = ClassificationBrowseCapture.getItems();
      const found =
        (rowIndex !== undefined && isMatch(captured[rowIndex]) ? captured[rowIndex] : undefined) ||
        captured.find(isMatch);
      if (found) return cy.wrap(found.id, { log: false });
      return this.getClassificationNumbersViaApi(classificationBrowseId, classificationNumber).then(
        (response) => {
          const match = response.body.items.find(isMatch);
          expect(
            Boolean(match),
            `browse item with classification number "${classificationNumber}"`,
          ).to.equal(true);
          return match.id;
        },
      );
    });
  },

  // Remembers the backend id of the classification about to be clicked in browse results
  storeClassificationId(classificationNumber, options = {}) {
    this.getClassificationId(classificationNumber, options).then((id) => {
      ClassificationBrowseCapture.setClickedId(id);
      cy.log(`Clicked classification id: ${id}`);
    });
  },

  // Remembers the text of the Title column of the given browse row. Browse row order is not
  // stable between runs, so this is how a test learns which instance a row stands for
  // (rows with "Number of titles" = 1 show that instance's title).
  storeRowTitle(rowIndex) {
    cy.do(
      MultiColumnListCell({ row: rowIndex, column: 'Title' }).perform((element) => {
        const title = element.textContent.trim();
        ClassificationBrowseCapture.setClickedTitle(title);
        cy.log(`Clicked row title: ${title}`);
      }),
    );
  },

  // Clicks the browse row and remembers the backend id and the title of the clicked item
  selectFoundValueByRowAndStoreId(rowIndex, value, options = {}) {
    this.storeClassificationId(value, { rowIndex, ...options });
    this.storeRowTitle(rowIndex);
    this.selectFoundValueByRow(rowIndex, value);
  },

  // Same as storeRowTitle, but finds the row by the exact (case-sensitive) text of its
  // Classification cell - for clicks done by value, when the row index is not known.
  // Only meaningful for rows with "Number of titles" = 1.
  storeRowTitleByValue(value) {
    cy.do(
      MultiColumnListCell({ content: value, columnIndex: 0 }).perform((element) => {
        const cells = element.parentElement.querySelectorAll('div[class*="mclCell-"]');
        const title = cells[1]?.textContent?.trim();
        ClassificationBrowseCapture.setClickedTitle(title);
        cy.log(`Clicked row title: ${title}`);
      }),
    );
  },

  // storeTitle (opt-in) additionally remembers the title of the clicked row; leave it off
  // for rows with several titles
  selectFoundValueByValueAndStoreId(value, { storeTitle = false, ...options } = {}) {
    this.storeClassificationId(value, options);
    if (storeTitle) this.storeRowTitleByValue(value);
    this.selectFoundValueByValue(value);
  },

  // Verifies the search query set by the browse -> search redirect is built from the stored id.
  // A trailing "and (classificationTypeId==...)" clause is allowed (substring match).
  verifyRedirectQueryUsesClickedClassificationId(querySearchOption = 'Query search') {
    cy.then(() => {
      const clickedClassificationId = ClassificationBrowseCapture.getClickedId();
      expect(clickedClassificationId, 'stored classification id').to.be.a('string');
      InventorySearchAndFilter.verifySearchOptionAndQuery(
        querySearchOption,
        `classificationId=="${clickedClassificationId}"`,
      );
    });
  },

  // Verifies the search page lists the instance whose browse row was clicked
  // (title stored by selectFoundValueByRowAndStoreId); optionally limited to a set of
  // expected titles to catch a bad read of the Title cell
  verifyClickedInstanceDisplayedInSearch(expectedTitles) {
    cy.then(() => {
      const clickedTitle = ClassificationBrowseCapture.getClickedTitle();
      if (expectedTitles) {
        expect(expectedTitles, 'clicked row title is one of the expected titles').to.include(
          clickedTitle,
        );
      }
      InventorySearchAndFilter.verifyInstanceDisplayed(clickedTitle);
    });
  },

  waitForBrowseResultsToLoad(alias) {
    cy.wait(`@${alias}`);
    cy.wait(1000);
  },

  checkPaginationButtonsShown() {
    cy.expect([nextButton.exists(), previousButton.exists()]);
  },

  clickNextPaginationButton() {
    cy.do(nextButton.click());
    cy.wait(2000);
  },

  clickPreviousPaginationButton() {
    cy.do(previousButton.click());
    cy.wait(2000);
  },

  getNextPaginationButtonState() {
    return cy.wrap(nextButton.perform((el) => !el.disabled));
  },

  getPreviousPaginationButtonState() {
    return cy.wrap(previousButton.perform((el) => !el.disabled));
  },

  verifyNextButtonDisabled(isDisabled = true) {
    cy.expect(nextButton.has({ disabled: isDisabled }));
  },

  verifyPreviousButtonDisabled(isDisabled = true) {
    cy.expect(previousButton.has({ disabled: isDisabled }));
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
