/// <reference types="cypress" />

import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitles from '../../support/fragments/eholdings/eHoldingsTitles';
import TopMenu from '../../support/fragments/topMenu';
import { testType, feature } from '../../support/utils/tagTools';

describe('eHoldings titles management', () => {
  // TODO: specify new user with permissions eHoldings: eHoldings: Can view providers, packages, titles detail records
  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals.', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.eholding);
    eHoldingSearch.switchToTitles();
    eHoldingSearch.bySubject('chemical engineering');
    eHoldingSearch.byPublicationType('Journal');
    eHoldingsTitles.openTitle();
    // TODO: the issue with filtering by subject, continue after issue UIEH-1225 solving
  });
});
