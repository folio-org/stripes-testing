import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';

describe('Organizations', () => {
  const firstOrganization = { ...NewOrganization.defaultUiOrganizations };
  const secondOrganization = {
    name: `autotest_name2_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `2ERP-${getRandomPostfix()}`,
  };
  const secondBankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };
  const firstBankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };
  let C423504User;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganization(firstOrganization.name);
      Organizations.editOrganization();
      Organizations.addBankingInformation(firstBankingInformation);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
    });
    Organizations.createOrganizationViaApi(secondOrganization).then(
      (responseSecondOrganizations) => {
        secondOrganization.id = responseSecondOrganizations;
        Organizations.searchByParameters('Name', secondOrganization.name);
        Organizations.checkSearchResults(secondOrganization);
        Organizations.selectOrganization(secondOrganization.name);
        Organizations.editOrganization();
        Organizations.addBankingInformation(secondBankingInformation);
        Organizations.closeDetailsPane();
      },
    );
    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewAndEditBankingInformation.gui,
    ]).then((secondUserProperties) => {
      C423504User = secondUserProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', firstOrganization.name);
    Organizations.checkSearchResults(firstOrganization);
    Organizations.selectOrganization(firstOrganization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.resetFilters();
    Organizations.searchByParameters('Name', secondOrganization.name);
    Organizations.checkSearchResults(secondOrganization);
    Organizations.selectOrganization(secondOrganization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.deleteOrganizationViaApi(firstOrganization.id);
    Organizations.deleteOrganizationViaApi(secondOrganization.id);
    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();
    Users.deleteViaApi(C423504User.userId);
  });

  it(
    'C423504 Viewing and editing "Banking information" record with "Organizations: View and edit banking information" permission (thunderjet)',
    { tags: ['criticalPathFlaky', 'thunderjet'] },
    () => {
      cy.login(C423504User.username, C423504User.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganization(firstOrganization.name);
      Organizations.buttonNewIsAbsent();
      Organizations.checkBankInformationExist(firstBankingInformation.name);
      Organizations.editOrganization();
      Organizations.editBankingInformationName(secondBankingInformation.name);
      Organizations.checkBankingInformationAddButtonIsDisabled();
      Organizations.saveOrganization();
      Organizations.checkBankInformationExist(secondBankingInformation.name);
    },
  );
});
