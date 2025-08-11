import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Organizations Settings', () => {
  const accountType = { ...SettingsOrganizations.defaultAccountTypes };
  const editedTypeName = `test_edited_${getRandomPostfix()}`;
  const tempChanges = `${editedTypeName}_temp`;
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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    SettingsOrganizations.deleteOrganizationAccountTypeViaApi(accountType.id);
    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();
  });

  it('C422087 Edit account type (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
    SettingsOrganizations.selectAccountTypes();
    SettingsOrganizations.checkBankingAccountTypesTableContent(accountType.name);
    SettingsOrganizations.checkNewAccountTypeButtonExists();
    SettingsOrganizations.clickEditAccountType(accountType.name);
    SettingsOrganizations.checkEditFieldState(accountType.name);
    SettingsOrganizations.clearAccountTypeField(accountType.name);
    SettingsOrganizations.fillAccountTypeName(editedTypeName);
    SettingsOrganizations.saveAccountTypeChanges();
    SettingsOrganizations.checkBankingAccountTypesTableContent(editedTypeName);
    SettingsOrganizations.checkRowActionButtons(editedTypeName);
    SettingsOrganizations.clickEditAccountType(editedTypeName);
    SettingsOrganizations.checkEditFieldState(editedTypeName);
    SettingsOrganizations.fillAccountTypeName(tempChanges);
    SettingsOrganizations.cancelAccountTypeChanges();
    SettingsOrganizations.checkBankingAccountTypesTableContent(editedTypeName);
    SettingsOrganizations.checkRowActionButtons(editedTypeName);
  });
});
