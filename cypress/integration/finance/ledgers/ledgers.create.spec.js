import { createDefaultLedger } from '../../../support/fragments/finance/ledgers/Ledgers';

import {
  Button
} from '../../../../interactors';

describe('ui-finance: Ledger list search and filters', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.visit('/finance/ledger');
      });
  });

  it('C4053 should create new ledger if mandatory fields are filled', function () {
    createDefaultLedger();
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-ledger-remove-confirmation-confirm' }).click()
    ]);
  });
});
