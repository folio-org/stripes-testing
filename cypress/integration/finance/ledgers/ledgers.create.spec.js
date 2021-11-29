import Ledgers from '../../../support/fragments/finance/ledgers/Ledgers';

import {
  Button
} from '../../../../interactors';

describe('ui-finance: Ledger list search and filters', () => {
  before(() => {
    cy.login('diku_admin', 'admin')
    .then(() => {
        cy.visit('/finance/ledger');
    });
  });

  it('should create new ledger if mandatory fields are filled', function () {
    // create and verify Ledger via UI
    Ledgers.createDefaultLedger();
    // delete created Ledger
    cy.do([
            Button('Actions').click(),
            Button('Delete').click(),
            Button('Delete', {id:"clickable-ledger-remove-confirmation-confirm"}).click()
        ]);
    });
});