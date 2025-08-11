import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Organizations Settings', () => {
  const existingAccountType = { ...SettingsOrganizations.defaultAccountTypes };
  const newAccountType = {
    name: `unique_type_${getRandomPostfix()}`,
  };
  let user;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
    SettingsOrganizations.createAccountTypesViaApi(existingAccountType);

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
    SettingsOrganizations.deleteOrganizationAccountTypeViaApi(existingAccountType.id);
    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();
  });

  it(
    'C422089 Account type name unique validation when create and edit account name (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      SettingsOrganizations.selectAccountTypes();
      SettingsOrganizations.checkBankingAccountTypesTableContent(existingAccountType.name);
      SettingsOrganizations.clickNewButton();
      SettingsOrganizations.checkNewAccountTypeRow();
      SettingsOrganizations.fillAccountTypeName(existingAccountType.name);
      SettingsOrganizations.checkDuplicateNameValidation();
      SettingsOrganizations.fillAccountTypeName(newAccountType.name);
      SettingsOrganizations.saveAccountTypeChanges();
      SettingsOrganizations.checkBankingAccountTypesTableContent(newAccountType.name);
      SettingsOrganizations.checkRowActionButtons(newAccountType.name);
      SettingsOrganizations.clickEditAccountType(newAccountType.name);
      SettingsOrganizations.checkEditFieldState(newAccountType.name);
      SettingsOrganizations.fillAccountTypeName(existingAccountType.name);
      SettingsOrganizations.checkDuplicateNameValidation();
      SettingsOrganizations.cancelAccountTypeChanges();
      SettingsOrganizations.checkBankingAccountTypesTableContent(newAccountType.name);
      SettingsOrganizations.checkRowActionButtons(newAccountType.name);
    },
  );
});
