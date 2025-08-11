import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';

describe('Organizations Settings', () => {
  const accountType = { ...SettingsOrganizations.defaultAccountTypes };
  let user;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
    SettingsOrganizations.createAccountTypesViaApi(accountType);

    cy.createTempUser([permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui]).then(
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
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();
    Users.deleteViaApi(user.userId);
  });

  it('C422088 Delete account type (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
    SettingsOrganizations.selectAccountTypes();
    SettingsOrganizations.checkBankingAccountTypesTableContent(accountType.name);
    SettingsOrganizations.checkNewAccountTypeButtonExists();
    SettingsOrganizations.clickDeleteAccountType(accountType.name);
    SettingsOrganizations.checkDeleteAccountTypeModal(accountType.name);
    SettingsOrganizations.cancelDeleteAccountType();
    SettingsOrganizations.checkBankingAccountTypesTableContent(accountType.name);
    SettingsOrganizations.deleteAccountType(accountType);
    SettingsOrganizations.checkAccountTypeAbsent(accountType.name);
  });
});
