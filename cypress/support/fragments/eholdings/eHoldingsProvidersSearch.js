import { Button, TextField, PaneContent } from '../../../../interactors';


export default {
  byProvider(provider) {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(provider));
    cy.do(Button('Search').click());
    // waitLoading is not working fine
    // eHoldingsProviders.waitLoading();
  },

  verifyTitleSearch() {
    cy.expect(PaneContent({ id: 'search-results-content' }).exists());
  }
};
