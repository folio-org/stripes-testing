import { MultiColumnList, PaneHeader, Section, HTML, including, Button, MultiColumnListCell, MultiColumnListRow, SearchField} from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const filtersSection = Section({ id: 'pane-authorities-filters' });

export default {
  waitLoading: () => cy.expect(rootSection.exists()),
  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),
  select:(specialInternalId) => cy.do(authoritiesList.find(Button({ href : including(specialInternalId) })).click()),
  selectFirst: (title) => cy.do(MultiColumnListRow({ index: 0}).find(Button(title)).click()),
  checkRow:(expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),
  checkRowsCount:(expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount + 1 })).absent()),
  switchToBrowse:() => cy.do(Button({ id:'segment-navigation-browse' }).click()),
  searchBy: (parameter, value) => {
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter));
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(filtersSection.find(Button({ id: 'submit-authorities-search' })).click());
  },
};
