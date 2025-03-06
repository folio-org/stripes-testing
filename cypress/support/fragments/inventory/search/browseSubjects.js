/* eslint-disable no-dupe-keys */
import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Link,
  matching,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Pane,
  Section,
  Select,
  TextArea,
  TextInput,
} from '../../../../../interactors';
import { escapeRegex } from '../../../utils/stringTools';
import InventorySearchAndFilter from '../inventorySearchAndFilter';

const searchButton = Button('Search', { type: 'submit' });
const browseInventoryPane = Pane('Browse inventory');
const inventoryPane = Pane('Inventory');
const searchFilterPane = Pane('Search & filter');
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const nextButton = Button({ id: 'browse-results-list-browseSubjects-next-paging-button' });
const previousButton = Button({ id: 'browse-results-list-browseSubjects-prev-paging-button' });
const mclhSubjectTitle = MultiColumnListHeader({ id: 'list-column-subject' });
const mclhNumberOfTTitle = MultiColumnListHeader({ id: 'list-column-numberoftitles' });
const recordSearch = TextInput({ id: 'input-record-search' });
const browseOptionSelect = Select('Search field index');

function getColumnsResults() {
  const cells = [];

  return cy
    .get('#browse-results-list-browseSubjects')
    .find('[data-row-index]')
    .each(($row) => {
      cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  getColumnsResults,
  verifyNonExistentSearchResult(searchString) {
    cy.expect(
      MultiColumnListCell({
        content: including(searchString),
        content: including('would be here'),
      }).exists(),
    );
  },

  verifyBrowseInventoryPane() {
    cy.expect([browseInventoryPane.exists(), searchFilterPane.exists()]);
  },

  verifyInventoryPane() {
    cy.expect(inventoryPane.exists());
  },

  verifyClickTakesNowhere(text) {
    this.verifyBrowseInventoryPane();
    cy.do(
      MultiColumnListCell({
        content: including(text),
        content: including('would be here'),
      }).click(),
    );
    this.verifyBrowseInventoryPane();
  },

  verifyClickTakesToInventory(text) {
    this.verifyBrowseInventoryPane();
    cy.do(
      MultiColumnListCell({ content: including(text) })
        .find(Link())
        .click(),
    );
    InventorySearchAndFilter.waitLoading();
    InventorySearchAndFilter.verifySearchResult(text);
  },

  checkSearchResultsTable() {
    cy.expect([
      mclhSubjectTitle.has({ content: 'Subject' }),
      mclhNumberOfTTitle.has({ content: 'Number of titles' }),
    ]);
  },

  checkResultAndItsRow(rowIndex, value) {
    cy.expect(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` }).has({ content: including(value) }),
    );
  },

  checkAbsenceOfResultAndItsRow(rowIndex, value) {
    cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}`, content: value }).absent());
  },

  checkPaginationButtons() {
    cy.expect([
      previousButton.is({ visible: true, disabled: false }),
      nextButton.is({ visible: true, disabled: false }),
    ]);
  },

  clickNextPaginationButton() {
    cy.do(inventorySearchResultsPane.find(nextButton).click());
  },

  clickPreviousPaginationButton() {
    cy.do(inventorySearchResultsPane.find(previousButton).click());
  },

  clearSearchTextfield() {
    cy.do(TextArea({ id: 'input-record-search' }).fillIn(''));
  },

  verifySearchTextFieldEmpty() {
    cy.get('#input-record-search').then((element) => {
      const searchText = element.attr('value');
      if (searchText) this.clearSearchTextfield();
    });
  },

  verifySearchValue(value) {
    cy.expect(recordSearch.has({ value }));
  },

  searchBrowseSubjects(searchString) {
    InventorySearchAndFilter.selectBrowseSubjects();
    this.verifySearchTextFieldEmpty();
    InventorySearchAndFilter.browseSearch(searchString);
  },

  checkAuthorityIconAndValueDisplayedForRow(rowIndex, value) {
    cy.expect([
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ content: including(value) }),
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ innerHTML: including('<img') }),
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({
        innerHTML: including('alt="MARC Authorities module">'),
      }),
    ]);
  },

  checkNoAuthorityIconDisplayedForRow(rowIndex, value) {
    cy.expect([
      MultiColumnListCell({ row: rowIndex, columnIndex: 0 }).has({ content: including(value) }),
      MultiColumnListCell({
        row: rowIndex,
        columnIndex: 0,
        innerHTML: including('alt="MARC Authorities module">'),
      }).absent(),
    ]);
  },

  checkRowValueIsBold(rowNumber, value) {
    cy.expect(
      MultiColumnListCell({ row: rowNumber, columnIndex: 0 }).has({
        innerHTML: including(`<strong>${value}</strong>`),
      }),
    );
  },

  checkValueIsBold(value) {
    cy.expect(MultiColumnListCell({ innerHTML: including(`<strong>${value}</strong>`) }).exists());
  },

  browse(subjectName) {
    cy.do(recordSearch.fillIn(subjectName));
    cy.expect([recordSearch.has({ value: subjectName }), searchButton.has({ disabled: false })]);
    cy.do(searchButton.click());
  },

  select() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(browseOptionSelect.choose('Subjects'));
    cy.expect(browseOptionSelect.has({ value: 'browseSubjects' }));
  },

  checkValueAbsentInRow(rowIndex, value) {
    cy.expect(
      MultiColumnListCell({ row: rowIndex, columnIndex: 0, content: including(value) }).absent(),
    );
  },

  checkRowWithValueAndNoAuthorityIconExists(value) {
    cy.expect(MultiColumnListCell({ columnIndex: 0, content: value }).exists());
  },

  checkRowWithValueAndAuthorityIconExists(value) {
    cy.expect(
      MultiColumnListCell({
        columnIndex: 0,
        content: 'Linked to MARC authority' + value,
      }).exists(),
    );
  },

  selectInstanceWithAuthorityIcon(value) {
    cy.do(
      MultiColumnListCell({
        columnIndex: 0,
        content: 'Linked to MARC authority' + value,
      })
        .find(Button(value))
        .click(),
    );
  },

  verifyNumberOfTitlesForRowWithValueAndAuthorityIcon(value, itemCount) {
    cy.expect(
      MultiColumnListRow({
        isContainer: true,
        content: including(`Linked to MARC authority${value}`),
      })
        .find(MultiColumnListCell({ column: 'Number of titles', content: itemCount.toString() }))
        .exists(),
    );
  },

  verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(value, itemCount) {
    cy.expect(
      MultiColumnListRow({
        isContainer: true,
        content: matching(new RegExp('^' + escapeRegex(value))),
      })
        .find(MultiColumnListCell({ column: 'Number of titles', content: itemCount.toString() }))
        .exists(),
    );
  },

  verifyNumberOfTitlesForRow(rowIndex, itemCount) {
    cy.expect(
      MultiColumnListCell({ row: rowIndex, columnIndex: 1 }).has({ content: itemCount.toString() }),
    );
  },

  verifyNoAccordionsOnPane() {
    cy.expect(Accordion().absent());
  },

  selectRecordByTitle(title) {
    cy.do(
      MultiColumnListRow({
        isContainer: true,
        content: title,
      })
        .find(Link())
        .click(),
    );
  },

  checkSearchResultRecord(record) {
    cy.expect(
      MultiColumnListCell(record).has({ innerHTML: including(`<strong>${record}</strong>`) }),
    );
  },

  checkResultIsAbsent(subjectValue) {
    cy.expect(
      inventorySearchResultsPane.find(MultiColumnListRow({ content: subjectValue })).absent(),
    );
  },

  waitForSubjectToAppear(subjectName, isPresent = true, isLinked = false) {
    const hasLinkedItem = (items) => {
      return items.some((item) => {
        return item.authorityId && item.authorityId !== '';
      });
    };
    return cy.recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: 'browse/subjects/instances',
          searchParams: {
            query: `(value>="${subjectName.replace(/"/g, '""')}")`,
          },
          isDefaultSearchParamsRequired: false,
        });
      },
      (response) => {
        const foundSubjects = response.body.items.filter((item) => {
          return item.value === subjectName;
        });

        if (isPresent) {
          if (isLinked) {
            return hasLinkedItem(foundSubjects);
          } else {
            return foundSubjects.length > 0 && !hasLinkedItem(foundSubjects);
          }
        } else {
          return foundSubjects.length === 0;
        }
      },
      {
        limit: 12,
        delay: 5000,
        timeout: 60000,
      },
    );
  },

  expandAccordion(accordionName) {
    cy.do(searchFilterPane.find(Accordion(accordionName)).clickHeader());
    cy.expect(searchFilterPane.find(Accordion(accordionName)).has({ open: true }));
  },

  selectSubjectSource(subjectSource) {
    cy.do(MultiSelect({ id: 'subjectSource-multiselect' }).fillIn(subjectSource));
    // need to wait until data will be loaded
    cy.wait(1000);
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(subjectSource)))
        .click(),
    );
    cy.wait(1000);
  },

  verifySearchResult: (cellContent) => {
    getColumnsResults().then((cells) => {
      cells.forEach((cell) => {
        if (cell !== 'No value set-') {
          cy.expect(cell).to.include(cellContent);
        }
      });
    });
  },
};
