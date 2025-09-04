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
    before(() => {
      cy.getAdminToken();
      EHoldingsPackages.createPackageViaAPI(EHoldingsPackages.getdefaultPackage())
        .then((newPackage) => {
          testPackage = newPackage;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uieHoldingsRecordsEdit.gui,
            Permissions.uiTagsPermissionAll.gui,
            Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.eholdingsPath,
                waiter: EHoldingsTitlesSearch.waitLoading,
              });
            }, 20_000);
            EHoldingsTitlesSearch.waitLoading();
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testPackage.data.attributes.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C756 Remove a tag from a package record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C756'] },
      () => {
        let addedTag;
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testPackage.data.attributes.name);
        EHoldingsPackages.openPackage()
          .then(() => {
            addedTag = EHoldingsPackage.addTag();
          })
          .then(() => {
            cy.wait(500); // wait for tag adding is reflected in database
            EHoldingsPackage.closePackage();
            EHoldingsPackagesSearch.byTag(addedTag);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.verifyExistingTags(addedTag);
            EHoldingsPackage.removeExistingTags();
            EHoldingsPackage.closePackage();
            EHoldingsPackagesSearch.verifyTagAbsent(addedTag);
          });
      },
    );
  });
});
