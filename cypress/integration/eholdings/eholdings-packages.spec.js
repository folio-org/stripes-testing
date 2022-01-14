/// <reference types="cypress" />

import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import permissions from '../../support/dictionary/permissions';
import features from '../../support/dictionary/features';


describe('eHoldings packages management', () => {
  let userId = '';
  beforeEach(() => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      permissions.moduleeHoldingsEnabled.gui
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdings);
      eHoldingSearch.switchToPackages();
      eHoldingsPackages.waitLoading();
    });
  });

  it('C688 Add a title in a package to holdings', { tags:  [testType.smoke, features.eHoldings] }, () => {
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
