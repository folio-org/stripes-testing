import { MultiColumnList, Callout, PaneContent, or, PaneHeader, Section, HTML, including, Button, MultiColumnListCell, MultiColumnListRow, SearchField } from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const filtersSection = Section({ id: 'pane-authorities-filters' });
const marcViewSectionContent = PaneContent({ id: 'marc-view-pane-content' });

export default {
  waitLoading: () => cy.expect(rootSection.exists()),

  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),

  select:(specialInternalId) => cy.do(authoritiesList.find(Button({ href : including(specialInternalId) })).click()),

  selectFirst: (title) => cy.do(MultiColumnListRow({ index: 0 }).find(Button(title)).click()),

  selectTitle: (title) => cy.do(Button(title).click()),

  selectItem: (item) => {
    cy.expect(MultiColumnListCell({content: item}).exists());
    cy.do(Button(including(item)).click());
  },

  verifySaveSuccess(successMsg, txt) {
    cy.expect(Callout(successMsg).exists());
    cy.expect(marcViewSectionContent.has({ text: including(`${txt.substring(0, 7)}  ${txt.substring(9, 19)} ${txt.substring(20, 24)}`) }));
  },

  checkRow:(expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),

  checkRowsCount:(expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount + 1 })).absent()),

  switchToBrowse:() => cy.do(Button({ id:'segment-navigation-browse' }).click()),
  
  searchBy: (parameter, value) => {
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter));
    cy.do(filtersSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(filtersSection.find(Button({ id: 'submit-authorities-search' })).click());
  },
};
