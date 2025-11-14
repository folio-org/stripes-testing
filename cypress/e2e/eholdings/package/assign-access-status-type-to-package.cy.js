import { Permissions } from '../../../support/dictionary';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AccessStatusTypes from '../../../support/fragments/settings/eholdings/accessStatusTypes';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';

describe('eHoldings', () => {
  describe('Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C9312_EH_Package_${randomPostfix}`,
      accessStatusTypeName: `AT_C9312_AccessStatusType_${randomPostfix}`,
    };
    let user;
    let createdAccessStatusTypeId;

    before('Create user, data and login', () => {
      cy.then(() => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          user = userProperties;
        });
        AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(
          testData.accessStatusTypeName,
        ).then((id) => {
          createdAccessStatusTypeId = id;
        });
        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
            },
          },
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName, true);
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(createdAccessStatusTypeId);
    });

    it(
      'C9312 Assign an Access status type to a selected package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9312'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);

        EHoldingsPackageView.edit();
        EHoldingsPackage.selectAccessStatusType(testData.accessStatusTypeName);
        EHoldingsPackage.verifyButtonsEnabled();
        EHoldingsPackage.saveAndClose();
        EHoldingsNewCustomPackage.checkPackageUpdatedCallout();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyAccessStatusType(testData.accessStatusTypeName);
      },
    );
  });
});
