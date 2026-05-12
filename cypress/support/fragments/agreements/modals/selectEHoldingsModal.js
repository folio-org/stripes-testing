import {
  Accordion,
  Button,
  HTML,
  Modal,
  MultiColumnListRow,
  RadioButton,
  Section,
  Spinner,
  TextField,
  including,
  or,
} from '../../../../../interactors';

const selectPackageModal = Modal({ id: 'find-package-title-modal' });
const searchFilterPane = Section({ title: 'Search & filter' });
const searchResultsSection = Section({ title: or('Packages', 'Titles') });
const sortOptionsAccordion = searchFilterPane.find(Accordion('Sort options'));
const nextPageButton = Button({ id: including('next-paging-button') });
const previousPageButton = Button({ id: including('prev-paging-button') });
const titlesToggleButton = searchFilterPane.find(Button({ id: 'title-tab' }));
const packagesToggleButton = searchFilterPane.find(Button({ id: 'package-tab' }));
const searchButton = Button('Search');
const searchInput = searchFilterPane.find(TextField({ type: 'search' }));

export default {
  waitLoading() {
    cy.expect(selectPackageModal.exists());
    cy.do(
      packagesToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  clickTitlesToggle() {
    cy.do(selectPackageModal.find(titlesToggleButton).click());
    cy.expect(searchResultsSection.has({ title: 'Titles' }));
    cy.do(
      titlesToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  verifySearchProcessed({ recordsFound = true } = {}) {
    cy.wait(500);
    cy.expect(searchResultsSection.find(Spinner()).absent());
    if (recordsFound) cy.expect(searchResultsSection.find(MultiColumnListRow()).exists());
    else {
      cy.expect(
        searchResultsSection.find(HTML({ className: including('noResultsMessage-') })).exists(),
      );
    }
  },

  searchForTitleOrPackage(searchQuery, { recordsFound = true } = {}) {
    cy.do([searchInput.fillIn(searchQuery), searchFilterPane.find(searchButton).click()]);
    this.verifySearchProcessed({ recordsFound });
  },

  getAllValuesFromColumn(columnIndex) {
    return cy
      .wait(3000)
      .get('#find-package-title-modal [class^="mclRow-"]')
      .then(($rows) => {
        const cellValues = [];
        $rows.each((_, row) => {
          const cell = row.querySelectorAll('[class^="mclCell-"]')[columnIndex];
          if (cell) {
            const cellText = cell.textContent.replace('would be here', '').trim();
            cellValues.push(cellText);
          }
        });
        return cellValues;
      });
  },

  getRecordTitle(rowIndex) {
    return cy
      .get('#find-package-title-modal [class^="mclRow-"]')
      .eq(rowIndex)
      .then(($row) => {
        const cell = $row[0].querySelectorAll('[class^="mclCell-"]')[1];
        return cell ? cell.textContent.trim() : '';
      });
  },

  checkAllValuesInColumnSorted(columnIndex) {
    this.getAllValuesFromColumn(columnIndex).then((cellValues) => {
      cy.expect(cellValues).to.deep.equal(cellValues.sort());
    });
  },

  toggleSortOptionsAccordion({ isOpened = true } = {}) {
    cy.do(sortOptionsAccordion.clickHeader());
    cy.expect(sortOptionsAccordion.has({ open: isOpened }));
  },

  sortRecords(sortOption, { recordsFound = true } = {}) {
    cy.then(() => sortOptionsAccordion.open()).then((isOpen) => {
      if (!isOpen) this.toggleSortOptionsAccordion();
      cy.do(sortOptionsAccordion.find(RadioButton(sortOption)).click());
      cy.expect(sortOptionsAccordion.find(RadioButton(sortOption)).has({ checked: true }));
      this.verifySearchProcessed({ recordsFound });
    });
  },

  verifyPreviousPageButtonEnabled(isEnabled = true) {
    cy.expect(selectPackageModal.find(previousPageButton).has({ disabled: !isEnabled }));
  },

  verifyNextPageButtonEnabled(isEnabled = true) {
    cy.expect(selectPackageModal.find(nextPageButton).has({ disabled: !isEnabled }));
  },

  clickNextPageButton() {
    cy.do(selectPackageModal.find(nextPageButton).click());
    this.verifySearchProcessed({ recordsFound: true });
  },

  clickPreviousPageButton() {
    cy.do(selectPackageModal.find(previousPageButton).click());
    this.verifySearchProcessed({ recordsFound: true });
  },

  verifyResultIsFocused(resultIndex = 0) {
    cy.expect(
      searchResultsSection.find(MultiColumnListRow({ index: resultIndex })).has({ focused: true }),
    );
  },

  verifySelectPackageModalIsClosed() {
    cy.expect(selectPackageModal.absent());
  },
};
