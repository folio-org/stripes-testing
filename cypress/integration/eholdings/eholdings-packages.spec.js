/// <reference types="cypress" />

import { testType, feature } from '../../support/utils/tagTools';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';

describe('eHoldings packages management', () => {
  let userId = '';
  beforeEach(() => {
    cy.createTempUser(['eHoldings: Can edit providers, packages, titles detail records',
      'eHoldings: Can view providers, packages, titles detail records',
      ' eHoldings: Can select/unselect packages and titles to/from your holdings']).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdings);
      eHoldingSearch.switchToPackages();
    });
  });

  it('C688 Add a title in a package to holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
