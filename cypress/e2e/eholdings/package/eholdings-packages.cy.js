import { DevTeams, TestTypes, Permissions, Features } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import Users from '../../../support/fragments/users/users';
import UHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';

describe('eHoldings', () => {
  describe('Package', () => {
    let userId;

    afterEach(() => {
      Users.deleteViaApi(userId);
    });

    it(
      'C688 Add all titles in a package to your holdings (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.getNotSelectedPackageIdViaApi().then((specialPackage) => {
            cy.login(userProperties.username, userProperties.password, {
              path: `${TopMenu.eholdingsPath}/packages/${specialPackage.id}`,
              waiter: () => EHoldingsPackage.waitLoading(specialPackage.name),
            });
            EHoldingsPackage.addToHoldings();
            EHoldingsPackage.verifyHoldingStatus();
            EHoldingsPackage.filterTitles();
            EHoldingsPackage.checkEmptyTitlesList();
            // reset test data
            EHoldingsPackage.removeFromHoldings();
          });
        });
      },
    );

    it(
      'C3463 Add two tags to package [Edinburgh Scholarship Online] (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings, Features.tags] },
      () => {
        // TODO: "Tags: All permissions" doesn't have displayName. It's the reason why there is related permission name in response, see https://issues.folio.org/browse/UITAG-51
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uiTagsPermissionAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName();
          EHoldingsPackages.openPackage().then((selectedPackage) => {
            const addedTag1 = EHoldingsPackage.addTag();
            const addedTag2 = EHoldingsPackage.addTag();
            EHoldingsPackage.close(selectedPackage);
            EHoldingsPackagesSearch.byName(selectedPackage);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.verifyExistingTags(addedTag1, addedTag2);
          });
        });
      },
    );

    it(
      'C3464 Update package proxy (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          UHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
          EHoldingsPackages.openPackage();
          EHoldingsPackage.editProxyActions();
          EHoldingsPackages.changePackageRecordProxy().then((newProxy) => {
            EHoldingsPackage.saveAndClose();
            // additional delay related with update of proxy information in ebsco services
            cy.wait(10000);
            EHoldingsPackages.verifyPackageRecordProxy(newProxy);
          });
        });
      },
    );

    it(
      'C690 Remove a package from your holdings (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.getNotCustomSelectedPackageIdViaApi().then((specialPackage) => {
            cy.login(userProperties.username, userProperties.password, {
              path: `${TopMenu.eholdingsPath}/packages/${specialPackage.id}`,
              waiter: () => EHoldingsPackage.waitLoading(specialPackage.name),
            });
            EHoldingsPackage.removeFromHoldings();
            EHoldingsPackage.verifyHoldingStatus(EHoldingsPackage.filterStatuses.notSelected);
            EHoldingsPackage.filterTitles(EHoldingsPackage.filterStatuses.notSelected);
            EHoldingsPackage.checkEmptyTitlesList();
            // reset test data
            EHoldingsPackage.addToHoldings();
          });
        });
      },
    );

    it(
      'C695 Package Record: Search all titles included in a package (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          UHoldingsProvidersSearch.byProvider('Wiley Online Library');
          EHoldingsPackagesSearch.bySelectionStatus('Selected');
          EHoldingsPackages.openPackage();
          EHoldingsPackages.titlesSearch('Subject', 'engineering');
          EHoldingsPackages.clickSearchTitles();
          EHoldingsPackages.subjectsAssertion();
        });
      },
    );

    it(
      'C756 Remove a tag from a package record (spitfire)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire, Features.eHoldings, Features.tags] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uiTagsPermissionAll.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName();
          EHoldingsPackages.openPackage().then((selectedPackageName) => {
            // existing test data clearing
            EHoldingsPackage.removeExistingTags();
            const addedTag = EHoldingsPackage.addTag();
            EHoldingsPackage.close(selectedPackageName);
            EHoldingsPackagesSearch.byTag(addedTag);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.verifyExistingTags(addedTag);
            EHoldingsPackage.removeExistingTags();
            cy.reload();
            EHoldingsPackage.verifyExistingTags();
          });
        });
      },
    );
  });
});
