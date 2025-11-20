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
      customPackageName: `AT_C9313_EH_Package_${randomPostfix}`,
      customTitleNamePrefix: `AT_C9313_EH_Title_${randomPostfix}`,
      accessStatusTypeName: `AT_C9313_AccessStatusType_${randomPostfix}`,
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
            for (let i = 0; i < 2; i++) {
              EHoldingsTitles.createEHoldingTitleVIaApi({
                titleName: `${testData.customTitleNamePrefix}_${i}`,
                packageId: id,
              });
            }
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
      'C9313 Filter title results by an access status type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9313'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyTitlesSearchElements();
        EHoldingsPackageView.verifyFilteredTitlesCount(2);

        EHoldingsPackageView.selectTitleRecord(0);
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.noStatusTypeText);

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.selectAccessStatusType(testData.accessStatusTypeName);
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.accessStatusTypeName);
        EHoldingsResourceView.closeHoldingsResourceView();

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.selectTitleRecord(1);
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.noStatusTypeText);

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.selectAccessStatusType(testData.accessStatusTypeName);
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyAccessStatusType(testData.accessStatusTypeName);
      },
    );
  });
});
