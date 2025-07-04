/* eslint-disable no-dupe-keys */
import { including, matching } from '@interactors/html';
import {
  Accordion,
  AppIcon,
  Button,
  Link,
  MultiColumnList,
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
const resultTable = MultiColumnList({ id: 'browse-results-list-browseSubjects' });

function getColumnsResults(columnName) {
  const cells = [];
  let index;

  switch (columnName) {
    case 'Subject source':
      index = 2;
      break;
    case 'Subject type':
      index = 3;
      break;
    default:
      index = 2;
      break;
  }

  return cy
    .get('#browse-results-list-browseSubjects')
    .find('[data-row-index]')
    .each(($row) => {
      cy.get(`[class*="mclCell-"]:nth-child(${index})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

function getRowIndexesBySubjectName(subject) {
  const rowIndexes = [];

  return cy
    .get('#browse-results-list-browseSubjects')
    .find('[data-row-index]')
    .each(($row) => {
      const trimmedText = $row.find('[class*="mclCell-"]:nth-child(1)').first().text().trim();

      if (trimmedText.includes(subject)) {
        const rowIndex = $row.attr('data-row-index');
        rowIndexes.push(rowIndex);
      }
    })
    .then(() => rowIndexes);
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
    cy.expect(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` }).has({ content: including(value) }),
    );
  },

  checkAbsenceOfResultAndItsRow(rowIndex, value) {
    cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}`, content: value }).absent());
  },

  checkPaginationButtons(
    state = {
      prev: { isVisible: true, isDisabled: false },
      next: { isVisible: true, isDisabled: false },
    },
  ) {
    cy.expect([
      previousButton.is({ visible: state.prev.isVisible, disabled: state.prev.isDisabled }),
      nextButton.is({ visible: state.next.isVisible, disabled: state.next.isDisabled }),
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
    cy.wait(2000);
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
      MultiColumnListCell({ row: rowIndex, columnIndex: 3 }).has({ content: itemCount.toString() }),
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
        limit: 20,
        delay: 5000,
        timeout: 120_000,
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
    cy.wait(4000);
  },

  selectSubjectType(subjectType) {
    cy.do(MultiSelect({ id: 'subjectType-multiselect' }).fillIn(subjectType));
    // need to wait until data will be loaded
    cy.wait(1000);
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(subjectType)))
        .click(),
    );
    cy.wait(4000);
  },

  openInstance: (subject) => {
    getRowIndexesBySubjectName(subject.name).then((rowIndexes) => {
      cy.do(
        resultTable
          .find(MultiColumnListRow({ indexRow: rowIndexes[0] }))
          .find(MultiColumnListCell({ columnIndex: 0, content: subject.name }))
          .find(Link())
          .click(),
      );
    });
  },

  verifySearchResult: (cellContent, columnName) => {
    getColumnsResults(columnName).then((cells) => {
      cells.forEach((cell) => {
        if (cell !== 'No value set-') {
          if (Array.isArray(cellContent)) {
            cellContent.forEach((content) => {
              cy.expect(content).to.satisfy((cellValue) => cellContent.some((val) => cellValue.includes(val)));
            });
          } else {
            cy.expect(cell).to.include(cellContent);
          }
        }
      });
    });
  },

  verifyDuplicateSubjectsWithDifferentSources: (subject) => {
    getRowIndexesBySubjectName(subject.name).then((rowIndexes) => {
      rowIndexes.forEach((index) => {
        cy.expect([
          resultTable
            .find(MultiColumnListRow({ indexRow: index }))
            .find(MultiColumnListCell({ columnIndex: 0, content: subject.name }))
            .exists(),
          resultTable
            .find(MultiColumnListRow({ indexRow: index }))
            .find(
              MultiColumnListCell({
                columnIndex: 1,
                content: matching(new RegExp(`^(${subject.firstSource}|${subject.secondSource})$`)),
              }),
            )
            .exists(),
          resultTable
            .find(MultiColumnListRow({ indexRow: index }))
            .find(MultiColumnListCell({ columnIndex: 2, content: subject.type }))
            .exists(),
          resultTable
            .find(MultiColumnListRow({ indexRow: index }))
            .find(MultiColumnListCell({ columnIndex: 3, content: '1' }))
            .exists(),
        ]);
      });
    });
  },

  verifyAccordionStatusByName(accordionName, status = true) {
    cy.expect(searchFilterPane.find(Accordion(accordionName)).has({ open: status }));
  },

  verifySubjectTypeDropdownOptions(types) {
    cy.expect(searchFilterPane.find(MultiSelect({ id: 'subjectType-multiselect' })).exists());
    cy.do(MultiSelect({ id: 'subjectType-multiselect' }).open());
    cy.expect(MultiSelectMenu().exists());
    cy.wait(1500);
    cy.then(() => MultiSelectMenu().optionList()).then((options) => {
      types.forEach((option) => {
        cy.wrap(options).then(
          (opts) => expect(opts.some((opt) => opt.includes(option))).to.be.true,
        );
      });
    });
  },

  clickOnAuthorityIcon(value) {
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    cy.do(
      MultiColumnListCell({ content: `Linked to MARC authority${value}` })
        .find(AppIcon({ dataLink: 'authority-app' }))
        .click(),
    );
    cy.get('@windowOpen')
      .should('have.been.called')
      .then((stub) => {
        const openedUrl = stub.args[0][0];
        expect(openedUrl).to.include('/marc-authorities/authorities/');
        cy.visit(openedUrl);
        cy.url().should('include', '/marc-authorities/authorities');
      });
  },
};
