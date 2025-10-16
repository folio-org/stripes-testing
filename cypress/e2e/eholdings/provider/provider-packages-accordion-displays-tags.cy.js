import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Provider', () => {
    let user;
    let testPackage;
    let addedTag;

    before('Create test data and add tag', () => {
      cy.getAdminToken();
      EHoldingsPackages.createPackageViaAPI(EHoldingsPackages.getdefaultPackage())
        .then((newPackage) => {
          testPackage = newPackage;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uieHoldingsRecordsEdit.gui,
            Permissions.uiTagsPermissionAll.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName(testPackage.data.attributes.name);
          EHoldingsPackages.openPackage();
          addedTag = EHoldingsPackage.addTag();
          cy.wait(500);

          EHoldingsPackage.verifyExistingTags(addedTag);
          EHoldingsPackage.closePackage();

          cy.login(user.username, user.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testPackage.data.attributes.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C17091 Provider record | Packages accordion displays tags (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C17091'] },
      () => {
        EHoldingsProvidersSearch.byProvider(testPackage.data.attributes.providerName);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(testPackage.data.attributes.providerName);
        EHoldingsProviders.verifyPackagesAccordionExpanded('true');

        EHoldingsProviders.searchPackageByName(testPackage.data.attributes.name);
        EHoldingsProviders.verifyPackageWithTag(testPackage.data.attributes.name, addedTag);
      },
    );
  });
});
