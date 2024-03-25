import permissions from '../../support/dictionary/permissions';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import BankingInformation from '../../support/fragments/settings/organizations/bankingInformation';

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
    accountNumber: `BankAN_${getRandomPostfix()}`,
  };
  const firstBankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: `BankAN_${getRandomPostfix()}`,
  };

  let user;

  before(() => {
    cy.getAdminToken();
    BankingInformation.setBankingInformationValue(true);
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
      firstBankingInformation.accountNumber = firstOrganization.erpCode;
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
        secondBankingInformation.accountNumber = secondOrganization.erpCode;
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
    BankingInformation.setBankingInformationValue(false);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423426: Searching in "Organization look-up" by "Bank account number" with appropriate permission (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex(
        'Bank account number',
        firstOrganization.erpCode,
        firstOrganization,
      );
      Orders.resetFilters();
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex(
        'Bank account number',
        secondOrganization.erpCode,
        secondOrganization,
      );
      Orders.resetFilters();
    },
  );
  it(
    'C423427: Searching in "Organization look-up" by "Bank account number" in "All" section with banking permission (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex('All', firstOrganization.erpCode, firstOrganization);
      Orders.resetFilters();
      Orders.openVendorFilterModal();
      Orders.searchVendorbyindex('All', secondOrganization.erpCode, secondOrganization);
      Orders.resetFilters();
    },
  );
});
