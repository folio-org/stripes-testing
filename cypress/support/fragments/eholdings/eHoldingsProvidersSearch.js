import { Button, TextField, PaneContent } from '../../../../interactors';
// eslint-disable-next-line import/no-cycle
import eHoldingsProviders from './eHoldingsProviders';

export default {
  byProvider(provider) {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(provider));
    cy.do(Button('Search').click());
    eHoldingsProviders.waitLoading();
  },

  verifyTitleSearch() {
    cy.expect(PaneContent({ id: 'search-results-content' }).exists());
  }
};
