import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AccessStatusTypes from '../../../support/fragments/settings/eholdings/accessStatusTypes';

describe('eHoldings', () => {
  describe('Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C11091_EH_Package_${randomPostfix}`,
      accessStatusTypeName: `AT_C11091_AccessStatusType_${randomPostfix}`,
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

          EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: {
                name: testData.customPackageName,
                contentType: 'E-Book',
                accessTypeId: createdAccessStatusTypeId,
              },
            },
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
      'C11091 Filter package results by an access status type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C11091'] },
      () => {
        EHoldingsPackagesSearch.openAccessStatusTypesDropdown();
        EHoldingsPackagesSearch.selectAccessStatusType(testData.accessStatusTypeName);
        EHoldingsPackagesSearch.checkResultsListShown();

        EHoldingsPackagesSearch.verifyResultsCount(1);
        EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
      },
    );
  });
});
