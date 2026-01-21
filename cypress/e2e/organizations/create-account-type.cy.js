import Permissions from '../../support/dictionary/permissions';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  describe('Settings (Organizations)', () => {
    let user;
    const accountType = {
      name: `TestAccountType_${getRandomPostfix()}`,
    };

    before('Create user', () => {
      cy.createTempUser([Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.settingsOrganizationsPath,
            waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrganizationsPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
      SettingsOrganizations.selectAccountTypes();
      SettingsOrganizations.deleteAccountType(accountType);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411687 Create an account type (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C411687'] },
      () => {
        SettingsOrganizations.selectAccountTypes();
        SettingsOrganizations.clickNewButton();
        SettingsOrganizations.clickOutsideAccountTypeField();
        SettingsOrganizations.checkErrorMessage();
        SettingsOrganizations.fillAccountTypeName(accountType.name);
        SettingsOrganizations.saveAccountTypeChanges();
        SettingsOrganizations.checkRowActionButtons(accountType.name);
      },
    );
  });
});
