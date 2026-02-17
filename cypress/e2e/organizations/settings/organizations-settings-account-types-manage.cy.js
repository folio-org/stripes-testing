import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Banking Information', () => {
  before('Enable Banking Information', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
  });

  describe('Account type - unique validation', () => {
    const existingAccountType = { ...SettingsOrganizations.defaultAccountTypes };
    const newAccountType = {
      name: `unique_type_${getRandomPostfix()}`,
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      SettingsOrganizations.createAccountTypesViaApi(existingAccountType);
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsOrganizations.deleteOrganizationAccountTypeViaApi(existingAccountType.id);
    });

    it(
      'C422089 Account type name unique validation when create and edit account name (thunderjet)',
      { tags: ['criticalPath', 'thunderjet'] },
      () => {
        // Verify banking information settings enabled: other settings might deactivate it
        SettingsOrganizations.selectBankingInformation();
        SettingsOrganizations.checkenableBankingInformationIfNeeded();

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

  describe('Account type - delete', () => {
    const accountType = { ...SettingsOrganizations.defaultAccountTypes };
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      SettingsOrganizations.createAccountTypesViaApi(accountType);
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it('C422088 Delete account type (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
      // Verify banking information settings enabled: other settings might deactivate it
      SettingsOrganizations.selectBankingInformation();
      SettingsOrganizations.checkenableBankingInformationIfNeeded();

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

  describe('Account type - edit', () => {
    const accountType = { ...SettingsOrganizations.defaultAccountTypes };
    const editedTypeName = `test_edited_${getRandomPostfix()}`;
    const tempChanges = `${editedTypeName}_temp`;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      SettingsOrganizations.createAccountTypesViaApi(accountType);
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsOrganizations.deleteOrganizationAccountTypeViaApi(accountType.id);
    });

    it('C422087 Edit account type (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
      // Verify banking information settings enabled: other settings might deactivate it
      SettingsOrganizations.selectBankingInformation();
      SettingsOrganizations.checkenableBankingInformationIfNeeded();

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

  describe('Account type - is not displayed', () => {
    let user;
    const accountType = { ...SettingsOrganizations.defaultAccountTypes };

    before('Create user', () => {
      cy.loginAsAdmin({
        path: TopMenu.settingsBankingInformationPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
      SettingsOrganizations.uncheckenableBankingInformationIfChecked();
      SettingsOrganizations.createAccountTypesViaApi(accountType);
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422063 "Account type" setting is NOT displayed when "Bank information" option is disabled (thunderjet)',
      { tags: ['extendedPath', 'thunderjet'] },
      () => {
        SettingsOrganizations.selectBankingInformation();
        SettingsOrganizations.checkenableBankingInformationIfNeeded();
        SettingsOrganizations.selectAccountTypes();
        SettingsOrganizations.ensureAccountTypesExist(1);
        SettingsOrganizations.selectBankingInformation();
        SettingsOrganizations.uncheckenableBankingInformationIfChecked();
      },
    );
  });

  describe('Account type - unable to delete', () => {
    let user;
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const existingAccountType = { name: `autotest_type_name_${getRandomPostfix()}` };
    const bankingInformation = {
      bankName: `AutoBank_${getRandomPostfix()}`,
      bankAccountNumber: '123456789012',
      transitNumber: '987654321',
      notes: 'Created from Automated test',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        bankingInformation.organizationId = response;
      });
      SettingsOrganizations.createAccountTypesViaApi(existingAccountType).then((response) => {
        existingAccountType.id = response.id;
        bankingInformation.accountTypeId = response.id;
      });
      Organizations.createBankingInformationViaApi(bankingInformation);

      cy.createTempUser([
        Permissions.uiOrganizationsView.gui,
        Permissions.uiOrganizationsViewBankingInformation.gui,
        Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.settingsOrganizationsPath,
            waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
          });
        });
      });
    });

    after(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrganizationsPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
      Organizations.deleteOrganizationViaApi(organization.id);
      SettingsOrganizations.selectAccountTypes();
      SettingsOrganizations.deleteAccountType(existingAccountType);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C590820: User cannot delete bank account types that is in use by one or more organizations (thunderjet)',
      { tags: ['criticalPath', 'thunderjet'] },
      () => {
        // Verify banking information settings enabled: other settings might deactivate it
        SettingsOrganizations.selectBankingInformation();
        SettingsOrganizations.checkenableBankingInformationIfNeeded();
        SettingsOrganizations.selectAccountTypes();
        SettingsOrganizations.checkNewAccountTypeButtonExists();
        SettingsOrganizations.tryToDeleteAccountTypeWhenItUnable(existingAccountType);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
        OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
        Organizations.selectOrganization(organization.name);
        Organizations.verifyBankingInformationAccordionIsPresent();
        Organizations.checkBankInformationExist(bankingInformation.bankName);
        Organizations.openBankInformationSection();
        Organizations.checkBankInformationExist(bankingInformation.bankAccountNumber);
      },
    );
  });
});
