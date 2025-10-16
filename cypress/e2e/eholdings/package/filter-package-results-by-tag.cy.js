import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    let user;
    let testPackage;
    let addedTag;

    before('Create test data', () => {
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
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testPackage.data.attributes.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1301 Filter package results by a tag (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1301'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testPackage.data.attributes.name);
        EHoldingsPackages.openPackage();
        addedTag = EHoldingsPackage.addTag();
        cy.wait(500);
        EHoldingsPackage.verifyExistingTags(addedTag);

        EHoldingsPackage.closePackage();

        EHoldingsPackagesSearch.byTag(addedTag);
        EHoldingsPackages.verifyPackageInResults(testPackage.data.attributes.name);
      },
    );
  });
});
