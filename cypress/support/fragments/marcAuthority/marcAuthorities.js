import { MultiColumnList, PaneHeader, Section, HTML, including, MultiColumnListCell, Button } from '../../../../interactors';

const rootSection = Section({ id: 'authority-search-results-pane' });
const authoritiesList = rootSection.find(MultiColumnList({ id: 'authority-result-list' }));
const getSpecialHref = (internalId) => `/marc-authorities/authorities/${internalId}?authRefType=Authorized&headingRef=Congress%20and%20foreign%20policy%20series&query=%2A&segment=search`;

export default {
  waitLoading: () => cy.expect(rootSection.exists()),
  waitRows: () => cy.expect(rootSection.find(PaneHeader()).find(HTML(including('found')))),
  select:(headingReferenceValue, specialInternalId) => {
    const specialHref = getSpecialHref(specialInternalId);
    cy.log('specialHref=' + specialHref);
    cy.do(authoritiesList
      .find(Button({ href : specialHref }))
      .click());
  }
};
