import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const type = { ...SettingsOrganizations.defaultAccountTypes };
  const category1 = { ...SettingsOrganizations.defaultCategories };
  const category2 = { id: uuid(), value: `autotest_category_name_2_${getRandomPostfix()}` };
  const organization = {
    name: `AutotestVendor_${getRandomPostfix()}`,
    status: 'Active',
    code: `test_code_${getRandomPostfix()}`,
    isVendor: true,
    addresses: [
      {
        addressLine1: 'Test address line 1',
        city: 'City',
        country: 'USA',
        stateRegion: 'State',
        zipCode: '12345',
        language: 'eng',
        categories: [category1.id, category2.id],
        isPrimary: true,
      },
    ],
  };
  const bankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: '',
  };
  const bankingInformation2 = {
    name: 'B'.repeat(70),
    accountNumber: 'A'.repeat(60),
    transitNumber: 'T'.repeat(40),
    notes: 'Test banking information note',
    addressCategory: category1.value,
    accountType: type.name,
  };

  let user;

  before(() => {
    cy.getAdminToken();
    SettingsOrganizations.createAccountTypesViaApi(type);
    SettingsOrganizations.createCategoriesViaApi(category1);
    SettingsOrganizations.createCategoriesViaApi(category2);
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
    SettingsOrganizations.selectAccountTypes();
    SettingsOrganizations.ensureAccountTypesExist(1);
    SettingsOrganizations.selectCategories();
    SettingsOrganizations.ensureCategoriesExist(3);

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });

    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditAndCreateBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();
    SettingsOrganizations.deleteOrganizationCategoriesViaApi(category1.id);
    SettingsOrganizations.deleteOrganizationCategoriesViaApi(category2.id);
    SettingsOrganizations.deleteOrganizationAccountTypeViaApi(type.id);
  });

  it(
    'C423519 Verifying all fields and "Cancel" option while adding "Banking information" record (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsPresent();
      Organizations.editOrganization();
      Organizations.fillINBankingInformationSection(bankingInformation);
      Organizations.cancelOrganization();
      Organizations.keepEditingOrganization();
      Organizations.cancelOrganization();
      Organizations.closeWithoutSaving();
      Organizations.checkBankInformationIsEmpty();
      Organizations.editOrganization();
      Organizations.addFullBankingInformation(bankingInformation2);
      cy.wait(5000);
      Organizations.verifyBankingInformationAccordionIsPresent();
    },
  );
});
