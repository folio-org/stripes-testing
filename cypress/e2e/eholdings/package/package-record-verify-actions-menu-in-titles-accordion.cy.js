import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Wiley Online Library',
    };
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
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

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
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
