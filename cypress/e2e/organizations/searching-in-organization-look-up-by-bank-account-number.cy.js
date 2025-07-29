import permissions from '../../support/dictionary/permissions';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import BankingInformation from '../../support/fragments/settings/organizations/bankingInformation';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('Organizations', { retries: { runMode: 1 } }, () => {
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

  let user;
  let C423432User;

  before(() => {
    cy.getAdminToken();
    BankingInformation.setBankingInformationValue(true);
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;

      cy.loginAsAdmin({
        path: SettingsMenu.organizationsPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
      SettingsOrganizations.selectBankingInformation();
      SettingsOrganizations.enableBankingInformation();

      cy.visit(TopMenu.organizationsPath);
      Organizations.waitLoading();
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganizationInCurrentPage(firstOrganization.name);
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
        Organizations.selectOrganizationInCurrentPage(secondOrganization.name);
        Organizations.editOrganization();
        Organizations.addBankingInformation(secondBankingInformation);
        Organizations.closeDetailsPane();
      },
    );
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrganizationsViewBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
    cy.createTempUser([permissions.uiOrdersView.gui]).then((secondUserProperties) => {
      C423432User = secondUserProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', firstOrganization.name);
    Organizations.checkSearchResults(firstOrganization);
    Organizations.selectOrganizationInCurrentPage(firstOrganization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.resetFilters();
    Organizations.searchByParameters('Name', secondOrganization.name);
    Organizations.checkSearchResults(secondOrganization);
    Organizations.selectOrganizationInCurrentPage(secondOrganization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.deleteOrganizationViaApi(firstOrganization.id);
    Organizations.deleteOrganizationViaApi(secondOrganization.id);
    BankingInformation.setBankingInformationValue(false);

    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.waitLoadingOrganizationSettings();
    SettingsOrganizations.enableBankingInformation();

    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(C423432User.userId);
  });

  it(
    'C423426 Searching in "Organization look-up" by "Bank account number" with appropriate permission (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet'] },
    () => {
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex(
        'Bank account number',
        firstBankingInformation.accountNumber,
        firstOrganization,
      );
      Orders.resetFilters();
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex(
        'Bank account number',
        secondBankingInformation.accountNumber,
        secondOrganization,
      );
      Orders.resetFilters();
    },
  );
  it(
    'C423427 Searching in "Organization look-up" by "Bank account number" in "All" section with banking permission (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex('All', firstBankingInformation.accountNumber, firstOrganization);
      Orders.resetFilters();
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex('All', secondBankingInformation.accountNumber, secondOrganization);
      Orders.resetFilters();
    },
  );

  it(
    'C423432 Searching in "Organization look-up" by "Bank account number" without banking permissions (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet'] },
    () => {
      cy.login(C423432User.username, C423432User.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.openVendorFilterModal();
      Orders.searchAbsentVendorbyindex(
        'All',
        firstBankingInformation.accountNumber,
        firstOrganization,
      );
      Orders.openVendorFilterModal();
      Orders.searchAbsentVendorbyindex(
        'All',
        secondBankingInformation.accountNumber,
        secondOrganization,
      );
    },
  );
});
