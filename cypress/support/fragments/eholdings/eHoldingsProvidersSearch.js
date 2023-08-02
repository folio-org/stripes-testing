import { Button, TextField } from '../../../../interactors';
import eHoldingsProviders from './eHoldingsProviders';

export default {
  byProvider(provider) {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(provider));
    cy.do(Button('Search').click());
    eHoldingsProviders.waitLoading();
  }
};
