/// <reference types="cypress" />

import { testType, feature } from '../../support/utils/tagTools';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';


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
      eHoldingsPackages.waitLoading();
    });
  });

  it('C688 Add a title in a package to holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingsPackagesSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.notSelected);
    eHoldingsPackagesSearch.byName();
    eHoldingsPackages.openPackage();
    eHoldingsPackage.addToHodlings();
    eHoldingsPackage.verifyHoldingStatus();
    eHoldingsPackage.filterTitles(eHoldingsPackage.filterTitlesStatuses.notSelected);
    eHoldingsPackage.checkEmptyTitlesList();
    // reset test data
    eHoldingsPackage.removeFromHoldings();
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
