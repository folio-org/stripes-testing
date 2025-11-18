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
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C11093_EH_Package_${randomPostfix}`,
      customTitleNamePrefix: `AT_C11093_EH_Title_${randomPostfix}`,
      accessStatusTypeName: `AT_C11093_AccessStatusType_${randomPostfix}`,
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
            for (let i = 0; i < 2; i++) {
              EHoldingsTitles.createEHoldingTitleVIaApi({
                titleName: `${testData.customTitleNamePrefix}_${i}`,
                packageId: id,
                // eslint-disable-next-line no-loop-func
              }).then((itemData) => {
                const resourceId = `${id}-${itemData.id}`;
                EHoldingsResourceEdit.updateResourceAttributesViaApi(resourceId, {
                  accessTypeId: createdAccessStatusTypeId,
                });
              });
            }
          });
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        EHoldingSearch.switchToTitles();
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName, true);
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(createdAccessStatusTypeId);
    });

    it(
      'C11093 Filter title results by an access status type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C11093'] },
      () => {
        EHoldingsPackagesSearch.openAccessStatusTypesDropdown();
        EHoldingsPackagesSearch.selectAccessStatusType(testData.accessStatusTypeName);
        EHoldingsPackagesSearch.checkResultsListShown();

        EHoldingsPackagesSearch.verifyResultsCount(2);
        for (let i = 0; i < 2; i++) {
          EHoldingsTitles.verifyTitleFound(`${testData.customTitleNamePrefix}_${i}`);
        }
      },
    );
  });
});
