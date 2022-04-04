/// <reference types="cypress" />

import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import permissions from '../../support/dictionary/permissions';
import features from '../../support/dictionary/features';


describe('eHoldings packages management', () => {
  let userId = '';

  it('C688 Add all titles in a package to your holdings', { tags:  [testType.smoke, features.eHoldings] }, () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      permissions.moduleeHoldingsEnabled.gui
    ]).then(userProperties => {
      userId = userProperties.userId;
      eHoldingsPackages.getNotSelectedPackageIdViaApi().then(specialPackage => {
        cy.login(userProperties.username, userProperties.password,
          { path: `${TopMenu.eholdingsPath}/packages/${specialPackage.id}`, waiter: () => eHoldingsPackage.waitLoading(specialPackage.name) });
        eHoldingsPackage.addToHodlings();
        eHoldingsPackage.verifyHoldingStatus();
        eHoldingsPackage.filterTitles();
        eHoldingsPackage.checkEmptyTitlesList();
        // reset test data
        eHoldingsPackage.removeFromHoldings();
      });
    });
  });

  it('C3463 Add two tags to package [Edinburgh Scholarship Online]', { tags:  [testType.smoke, features.eHoldings, features.tags] }, () => {
    // TODO: "Tags: All permissions" doesn't have displayName. It's the reason why there is related permission name in response, see https://issues.folio.org/browse/UITAG-51
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uiTagsPermissionAll.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
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
      eHoldingsPackages.getNotCustomSelectedPackageIdViaApi().then(specialPackage => {
        cy.login(userProperties.username, userProperties.password,
          { path: `${TopMenu.eholdingsPath}/packages/${specialPackage.id}`, waiter: () => eHoldingsPackage.waitLoading(specialPackage.name) });

        eHoldingsPackage.removeFromHoldings();
        eHoldingsPackage.verifyHoldingStatus(eHoldingsPackage.filterStatuses.notSelected);
        eHoldingsPackage.filterTitles(eHoldingsPackage.filterStatuses.notSelected);
        eHoldingsPackage.checkEmptyTitlesList();
        // reset test data
        eHoldingsPackage.addToHodlings();
      });
    });
  });

  it('C756 Remove a tag from a package record', { tags:  [testType.extendedPath, features.eHoldings, features.tags] }, () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui, permissions.uiTagsPermissionAll.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
      eHoldingSearch.switchToPackages();
      eHoldingsPackagesSearch.byName();
      eHoldingsPackages.openPackage()
        .then(selectedPackageName => {
          // existing test data clearing
          eHoldingsPackage.removeExistingTags();

          const addedTag = eHoldingsPackage.addTag();
          eHoldingsPackage.close(selectedPackageName);
          eHoldingsPackagesSearch.byTag(addedTag);
          eHoldingsPackages.openPackage();
          eHoldingsPackage.verifyExistingTags(addedTag);
          eHoldingsPackage.removeExistingTags();
          eHoldingsPackage.close(selectedPackageName);
          eHoldingsPackagesSearch.resetTagFilter();
          eHoldingsPackagesSearch.byName(selectedPackageName);
          eHoldingsPackages.openPackage();
          eHoldingsPackage.verifyExistingTags();
        });
    });
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
