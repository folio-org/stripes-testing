import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import UHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    let userId;
    const defaultPackage = { ...EHoldingsPackages.getdefaultPackage() };

    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    after(() => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(defaultPackage.data.attributes.name);
    });

    it(
      'C688 Add all titles in a package to your holdings (spitfire)',
      { tags: ['smoke', 'spitfire'] },
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
      { tags: ['smoke', 'spitfire'] },
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
            EHoldingsPackage.closePackage();
            EHoldingsPackagesSearch.byName(selectedPackage);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.verifyExistingTags(addedTag1, addedTag2);
          });
        });
      },
    );

    it('C3464 Update package proxy (spitfire)', { tags: ['criticalPath', 'spitfire'] }, () => {
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
    });

    it(
      'C690 Remove a package from your holdings (spitfire)',
      { tags: ['smoke', 'spitfire'] },
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
      { tags: ['criticalPath', 'spitfire'] },
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
      { tags: ['extendedPath', 'spitfire'] },
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
          EHoldingsPackages.openPackage().then(() => {
            // existing test data clearing
            EHoldingsPackage.removeExistingTags();
            const addedTag = EHoldingsPackage.addTag();
            EHoldingsPackage.closePackage();
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

    it(
      'C699 Add or edit package custom coverage (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.createPackageViaAPI().then(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsPackages.waitLoading,
            });

            const yesterday = DateTools.getPreviousDayDate();
            const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
            EHoldingSearch.switchToPackages();
            // wait until package is created via API
            cy.wait(10000);
            UHoldingsProvidersSearch.byProvider(defaultPackage.data.attributes.name);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.editProxyActions();
            EHoldingsPackages.fillDateCoverage(yesterday, today);
            EHoldingsPackage.saveAndClose();
            EHoldingsPackages.verifyCustomCoverageDates(yesterday, today);
          });
        });
      },
    );

    it(
      'C3466 Edit/Add a token to the Gale Academic OneFile (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          const token = `Test${getRandomPostfix()}`;
          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName('Gale Academic OneFile');
          EHoldingsPackages.openPackage();
          EHoldingsPackage.editProxyActions();
          EHoldingsPackage.changeToken(token);
          EHoldingsPackage.saveAndClose();
          // wait until the token to be changed
          cy.wait(10000);
          cy.reload();
          EHoldingsPackage.verifyToken(token);
        });
      },
    );

    it(
      'C703 Set [Show titles in package to patrons] to Hide (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          // wait until package is created via API
          cy.wait(10000);
          UHoldingsProvidersSearch.byProvider(defaultPackage.data.attributes.name);
          EHoldingsPackagesSearch.bySelectionStatus('Selected');
          EHoldingsPackages.openPackage();
          EHoldingsPackage.editProxyActions();
          EHoldingsPackageView.patronRadioButton('No');
          EHoldingsPackage.saveAndClose();
          EHoldingsPackageView.verifyAlternativeRadio('No');
        });
      },
    );
  });
});
