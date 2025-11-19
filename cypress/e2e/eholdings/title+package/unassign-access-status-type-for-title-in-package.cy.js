import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
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
  describe('Title+Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C9314_EH_Package_${randomPostfix}`,
      customTitleName: `AT_C9314_EH_Title_${randomPostfix}`,
      accessStatusTypeName: `AT_C9314_AccessStatusType_${randomPostfix}`,
      noStatusTypeText: 'No access status type is selected-',
    };
    let user;
    let createdAccessStatusTypeId;

    before('Create user, data and login', () => {
      cy.then(() => {
        cy.createTempUser([
          Permissions.moduleeHoldingsEnabled.gui,
          Permissions.uieHoldingsRecordsEdit.gui,
        ]).then((userProperties) => {
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
      'C9314 Unassign an access status type from a package + title (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9314'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyTitlesSearchElements();
        EHoldingsPackageView.verifyFilteredTitlesCount(1);

        EHoldingsPackageView.selectTitleRecord(0);
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.accessStatusTypeName);

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.removeAccessStatusType();
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.noStatusTypeText);
      },
    );
  });
});
