import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AccessStatusTypes from '../../../support/fragments/settings/eholdings/accessStatusTypes';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';

describe('eHoldings', () => {
  describe('Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C11094_EH_Package_${randomPostfix}`,
      customTitleName: `AT_C11094_EH_Title_${randomPostfix}`,
      accessStatusTypeName: `AT_C11094_AccessStatusType_${randomPostfix}`,
    };
    let user;
    let createdAccessStatusTypeId;

    before('Create user, data and login', () => {
      cy.then(() => {
        cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
          user = userProperties;
        });
        AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(
          testData.accessStatusTypeName,
        ).then((typeId) => {
          createdAccessStatusTypeId = typeId;

          EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: {
                name: testData.customPackageName,
                contentType: 'E-Book',
              },
            },
          }).then(({ data: { id } }) => {
            EHoldingsTitles.createEHoldingTitleVIaApi({
              titleName: testData.customTitleName,
              packageId: id,
            }).then((itemData) => {
              const resourceId = `${id}-${itemData.id}`;
              EHoldingsResourceEdit.updateResourceAttributesViaApi(resourceId, {
                accessTypeId: createdAccessStatusTypeId,
              });
            });
            // Additional title for the same package with no access status type assigned
            EHoldingsTitles.createEHoldingTitleVIaApi({
              titleName: `${testData.customTitleName} No type`,
              packageId: id,
            });
          });
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingSearch.switchToPackages();
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName, true);
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(createdAccessStatusTypeId);
    });

    it(
      'C11094 Filter package results by an access status type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C11094'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyTitlesSearchElements();
        EHoldingsPackageView.verifyFilteredTitlesCount(2);

        EHoldingsPackageView.filterTitlesByAccessStatusTypes(testData.accessStatusTypeName);
        EHoldingsPackageView.verifyFilteredTitlesCount(1);
        EHoldingsPackage.verifyTitleFound(testData.customTitleName);

        EHoldingsPackageView.selectTitleRecord();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.accessStatusTypeName);
      },
    );
  });
});
