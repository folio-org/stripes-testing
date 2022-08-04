import TestType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';


describe('eHoldings packages management', () => {
  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  it.only('C688 Add all titles in a package to your holdings (spitfire)', { tags:  [TestType.smoke, Features.eHoldings, DevTeams.spitfire] }, () => {
    eHoldingsPackages.getNotSelectedPackageIdViaApi().then(specialPackage => {
      cy.visit(`${TopMenu.eholdingsPath}/packages/${specialPackage.id}`);
      eHoldingsPackage.waitLoading(specialPackage.name);
    });
    eHoldingsPackage.addToHodlings();
    eHoldingsPackage.verifyHoldingStatus();
    eHoldingsPackage.filterTitles();
    eHoldingsPackage.checkEmptyTitlesList();
    // reset test data
    eHoldingsPackage.removeFromHoldings();
  });

  it('C3463 Add two tags to package [Edinburgh Scholarship Online] (spitfire)', { tags:  [TestType.smoke, Features.eHoldings, Features.tags, DevTeams.spitfire] }, () => {
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

it('C690 Remove a package from your holdings (spitfire)', { tags:  [TestType.smoke, Features.eHoldings, DevTeams.spitfire] }, () => {
  eHoldingsPackages.getNotCustomSelectedPackageIdViaApi()
    .then(specialPackage => {
      cy.visit(`${TopMenu.eholdingsPath}/packages/${specialPackage.id}`);
      eHoldingsPackage.waitLoading(specialPackage.name);
    });

  eHoldingsPackage.removeFromHoldings();
  eHoldingsPackage.verifyHoldingStatus(eHoldingsPackage.filterStatuses.notSelected);
  eHoldingsPackage.filterTitles(eHoldingsPackage.filterStatuses.notSelected);
  eHoldingsPackage.checkEmptyTitlesList();
  // reset test data
  eHoldingsPackage.addToHodlings();
});

it('C756 Remove a tag from a package record (spitfire)', { tags:  [TestType.extendedPath, Features.eHoldings, Features.tags, DevTeams.spitfire] }, () => {
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
