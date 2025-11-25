import {
  Section,
  Button,
  SearchField,
  Checkbox,
  Accordion,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelect,
  Select,
  TextArea,
  PaneContent,
} from '../../../../interactors';
import marcAuthorities from './marcAuthorities';
import { REFERENCES_FILTER_CHECKBOXES } from '../../constants';

const rootSection = Section({ id: 'pane-authorities-filters' });
const referencesFilterAccordion = Accordion('References');
const authorityList = MultiColumnList({ id: 'authority-result-list' });
const collapseButton = Button({ icon: 'caret-left' });
const expandButton = Button({ icon: 'caret-right' });
const resultsPane = Section({ id: 'authority-search-results-pane' });
const showFiltersButton = Button('Show filters');
const searchInput = SearchField({ id: 'textarea-authorities-search' });
const searchButton = Button({ id: 'submit-authorities-search' });
const resetAllButton = Button({ id: 'clickable-reset-all' });
const advancedSearchButton = Button('Advanced search');
const searchAccordionNames = [
  'Authority source',
  'References',
  'Thesaurus',
  'Type of heading',
  'Date created',
  'Date updated',
];

export default {
  searchBy: (parameter, value) => {
    cy.do(
      rootSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter),
    );
    cy.do(rootSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(rootSection.find(Button({ id: 'submit-authorities-search' })).click());
    marcAuthorities.waitLoading();
  },

  selectExcludeReferencesFilter(checkbox = REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
    cy.then(() => referencesFilterAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(referencesFilterAccordion.clickHeader());
      }
    });
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from' }))
          .checkIfNotSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from also' }))
          .checkIfNotSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
  },

  unselectExcludeReferencesFilter(checkbox = REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
    cy.then(() => referencesFilterAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(referencesFilterAccordion.clickHeader());
      }
    });
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
      cy.do([
        referencesFilterAccordion.find(Checkbox({ label: 'Exclude see from' })).uncheckIfSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from also' }))
          .uncheckIfSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
  },

  selectAuthorityByIndex(rowIndex) {
    cy.do([
      authorityList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Button())
        .click(),
    ]);
  },

  verifyFiltersState: (selectedFilterValue, searchValue, toggle) => {
    if (toggle === 'Search') {
      cy.expect([
        Button({ id: 'segment-navigation-search' }).has({ disabled: false, visible: true }),
        Button({ id: 'segment-navigation-browse' }).has({ disabled: false }),
      ]);
    }
    if (toggle === 'Browse') {
      cy.expect([
        Button({ id: 'segment-navigation-search' }).has({ disabled: false }),
        Button({ id: 'segment-navigation-browse' }).has({ disabled: false, visible: true }),
      ]);
    }
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include('Personal name');
    });
    cy.expect([
      Select({ id: 'textarea-authorities-search-qindex' }).has({ value: selectedFilterValue }),
      TextArea({ id: 'textarea-authorities-search' }).has({ value: searchValue }),
      Section({ id: 'sourceFileId' })
        .find(MultiSelect({ selectedCount: 0 }))
        .exists(),
    ]);
  },

  collapseSearchPane() {
    cy.do([collapseButton.click()]);
  },

  verifySearchPaneIsCollapsed(isResultsEmpty = false) {
    cy.expect([rootSection.absent(), expandButton.exists()]);
    if (isResultsEmpty) {
      resultsPane.find(showFiltersButton).exists();
    } else {
      resultsPane.find(showFiltersButton).absent();
    }
  },

  expandSearchPane() {
    cy.do(expandButton.click());
  },

  verifySearchPaneExpanded(isResultsEmpty = false) {
    cy.expect([
      rootSection.exists(),
      rootSection.find(collapseButton).exists(),
      resultsPane.find(showFiltersButton).absent(),
    ]);

    if (isResultsEmpty) {
      resultsPane.find(PaneContent()).has({ empty: true });
    } else {
      resultsPane.find(PaneContent()).has({ empty: false });
    }
  },

  clickShowFilters() {
    cy.do(resultsPane.find(showFiltersButton).click());
    cy.expect([
      rootSection.exists(),
      collapseButton.exists(),
      resultsPane.find(PaneContent()).has({ empty: true }),
      resultsPane.find(showFiltersButton).absent(),
    ]);
  },

  fillSearchInput(value) {
    cy.do(rootSection.find(searchInput).fillIn(value));
    this.checkSearchQuery(value);
  },

  clickSearchButton() {
    cy.do(rootSection.find(searchButton).click());
  },

  verifyDefaultSearchPaneState() {
    this.verifySearchPaneExpanded(true);
    cy.expect([
      searchButton.has({ disabled: true }),
      resetAllButton.has({ disabled: true }),
      advancedSearchButton.exists(),
    ]);
    searchAccordionNames.forEach((name, index) => {
      if (index) cy.expect(Accordion(name).has({ open: false }));
      else cy.expect(Accordion(name).has({ open: true }));
    });
    this.verifyFiltersState('keyword', '', 'Search');
    marcAuthorities.checkRecordsResultListIsAbsent();
    marcAuthorities.verifyEmptyAuthorityField();
  },

  verifySelectedSearchOption: (parameter) => {
    cy.expect(
      SearchField({ id: 'textarea-authorities-search' }).has({ selectedFilterText: parameter }),
    );
  },

  selectSearchOption: (parameter) => {
    cy.do(SearchField({ id: 'textarea-authorities-search' }).selectIndex(parameter));
  },

  checkSearchQuery(value) {
    cy.expect(searchInput.has({ value }));
  },
};
