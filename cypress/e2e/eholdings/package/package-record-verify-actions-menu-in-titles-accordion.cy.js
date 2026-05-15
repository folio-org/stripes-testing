import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AccessStatusTypes from '../../../support/fragments/settings/eholdings/accessStatusTypes';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Wiley Online Library',
    };
    let user;
    let accessStatusTypeId;

    before('Create user and login', () => {
      cy.getAdminToken();
      // need to have at least 1 access status type to have related checkbox in UI
      AccessStatusTypes.getAccessStatusTypesForDefaultKbViaApi().then((types) => {
        if (!types.length) {
          AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(
            `AT_C1259792_AccessStatusType_${getRandomPostfix()}`,
          ).then((id) => {
            accessStatusTypeId = id;
          });
        }
      });

      cy.then(() => {
        cy.createTempUser([
          Permissions.moduleeHoldingsEnabled.gui,
          Permissions.uiTagsPermissionAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToPackages();
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(accessStatusTypeId);
    });

    it(
      'C1259792 Package Record: Verify the "Actions" menu options in the "Titles" accordion. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1259792'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.packageName);
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.checkAllShowColumnsCheckboxes();
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);

        EHoldingsPackageView.verifyTitlesSearchElements();

        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.verifyTitlesActionsMenuOptions();
        EHoldingsPackageView.verifyPublicationTypeDropdownOptions();
        EHoldingsPackageView.verifyTitlesShowColumnsCheckboxes();
      },
    );
  });
});
