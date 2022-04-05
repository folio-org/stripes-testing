import { MultiColumnList, PaneHeader, Section, HTML, including, Button, MultiColumnListCell, MultiColumnListRow } from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const getSpecialHref = (internalId) => `/marc-authorities/authorities/${internalId}?authRefType=Authorized&headingRef=Congress%20and%20foreign%20policy%20series`;

export default {
  waitLoading: () => cy.expect(rootSection.exists()),
  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),
  select:(specialInternalId) => {
    const specialHref = getSpecialHref(specialInternalId);
    cy.do(authoritiesList.find(Button({ href : specialHref })).click());
  },
  checkRow:(expectedHeadingReference) => cy.expect(authoritiesList.find(MultiColumnListCell(expectedHeadingReference)).exists()),
  checkRowsCount:(expectedRowsCount) => cy.expect(authoritiesList.find(MultiColumnListRow({ index: expectedRowsCount + 1 })).absent()),
  switchToBrowse:() => cy.do(Button({ id:'segment-navigation-browse' }).click())
};
