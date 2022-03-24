import { Accordion, Button, MultiColumnListHeader, SearchField, Section, HTML, including, MultiColumnListRow } from '../../../../interactors';

// TODO: redefine section id
const rootSection = Section({ id: 'authority-search-results-pane' });
const presentedColumns = ['Authorized/Reference', 'Heading/Reference', 'Type of heading'];
const rootPaneAuthoritiesFilters = Section({ id: 'pane-authorities-filters' });
const defaultMainFilterValue = { htmlValue:'none', visibleValue: 'None' };
const searchButton = rootPaneAuthoritiesFilters.find(Button({ id: 'submit-authorities-search' }));
const mainFilter = rootPaneAuthoritiesFilters.find(SearchField({ id:'textarea-authorities-search' }));
const getFirstLineIndexRow = (zeroIndex) => `row-${zeroIndex + 52}`;

export default {
  waitEmptyTable: () => {
    cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results'))).exists());
  },
  waitLoading:() => {
    cy.expect(rootSection.find(HTML(including('Loading...'))).absent());
    cy.expect(rootSection.find(MultiColumnListRow({ indexRow: getFirstLineIndexRow(0) })).exists());
  },
  checkPresentedColumns:() => presentedColumns.forEach(columnName => cy.expect(rootSection.find(MultiColumnListHeader(columnName)).exists())),
  checkFiltersInitialState:() => {
    cy.expect(mainFilter.has({ selectedFilter:defaultMainFilterValue.htmlValue }));
    cy.expect(searchButton.has({ disabled:true }));
    cy.expect(rootPaneAuthoritiesFilters.find(Button({ id:'clickable-reset-all' })).has({ disabled:true }));
    cy.expect(rootPaneAuthoritiesFilters.find(Accordion('References')).exists());
  },
  searchBy:(parameter, value) => {
    cy.do(mainFilter.selectIndex(parameter));
    cy.do(mainFilter.fillIn(value));
    cy.do(searchButton.click());
  }
};
