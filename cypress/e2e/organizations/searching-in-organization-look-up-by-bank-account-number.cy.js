import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Organizations from '../../support/fragments/organizations/organizations';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';

describe('Searching in organization look-up', { retries: { runMode: 1 } }, () => {
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
  before('Enable Banking Information', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
  });

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
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
