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

  it('C688 Add a title in a package to holdings', { tags:  [testType.smoke, features.eHoldings] }, () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      permissions.moduleeHoldingsEnabled.gui
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdings);
      eHoldingSearch.switchToPackages();
      eHoldingsPackages.waitLoading();
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
  });

  it.only('C3463 Add two tags to package [Edinburgh Scholarship Online]', { tags:  [testType.smoke, features.eHoldings] }, () => {
    // TODO: "Tags: All permissions" doesn't have displayName. It's the reason why there is related permission name in response, see https://issues.folio.org/browse/UITAG-51
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uiTagsPermissionAll.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdings);
      eHoldingSearch.switchToPackages();
      eHoldingsPackagesSearch.byName();
      eHoldingsPackages.openPackage()
        .then(selectedPackage => {
          const addedTag1 = eHoldingsPackage.addTag();
          const addedTag2 = eHoldingsPackage.addTag();
          eHoldingsPackage.close(selectedPackage);
          eHoldingsPackagesSearch.byName(selectedPackage);
          eHoldingsPackages.openPackage();
          eHoldingsPackage.verifyExistingTags(addedTag1, addedTag2);
        });
    });
  });

  it('C690 Remove a package from your holdings', { tags:  [testType.smoke, features.eHoldings] }, () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdings);
      eHoldingSearch.switchToPackages();
      eHoldingsPackagesSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.selected);
      eHoldingsPackagesSearch.byName();
      eHoldingsPackages.openPackage();
      eHoldingsPackage.removeFromHoldings();
      eHoldingsPackage.verifyHoldingStatus(eHoldingsPackage.filterTitlesStatuses.notSelected);
      eHoldingsPackage.filterTitles(eHoldingsPackage.filterTitlesStatuses.selected);
      eHoldingsPackage.checkEmptyTitlesList();
      // reset test data
      eHoldingsPackage.addToHodlings();
    });
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
