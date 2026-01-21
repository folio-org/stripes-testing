import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  describe('Searching in organization look-up', { retries: { runMode: 1 } }, () => {
    let user;
    const firstOrganization = { ...NewOrganization.defaultUiOrganizations };
    const secondOrganization = {
      name: `autotest_name2_${getRandomPostfix()}`,
      status: 'Active',
      code: `autotest_code_${getRandomPostfix()}`,
      isVendor: true,
      erpCode: `2ERP-${getRandomPostfix()}`,
    };
    const firstBankingInformation = {
      bankName: `Test Bank ${Date.now()}`,
      bankAccountNumber: '1234567890',
      transitNumber: '987654321',
      notes: 'Test banking information',
    };
    const secondBankingInformation = {
      bankName: `Test Bank ${Date.now()}`,
      bankAccountNumber: '1234567890',
      transitNumber: '987654321',
      notes: 'Test banking information',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      SettingsOrganizations.getBankingInformationStatusViaApi().then((response) => {
        if (response.settings[0].value === 'false') {
          response.settings[0].value = true;
          SettingsOrganizations.enableBankingInformationViaApi(response);
        }
      });
      Organizations.createOrganizationViaApi(firstOrganization).then((orgId) => {
        firstOrganization.id = orgId;
        firstBankingInformation.organizationId = orgId;
        Organizations.createBankingInformationViaApi(firstBankingInformation);
      });
      Organizations.createOrganizationViaApi(secondOrganization).then((orgId) => {
        secondOrganization.id = orgId;
        secondBankingInformation.organizationId = orgId;
        Organizations.createBankingInformationViaApi(secondBankingInformation);
      });

      cy.createTempUser([
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewBankingInformation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after('Cleanup test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      [firstOrganization.id, secondOrganization.id].forEach((organizationId) => {
        Organizations.deleteOrganizationViaApi(organizationId);
      });
    });

    it(
      'C423427 Searching in "Organization look-up" by "Bank account number" in "All" section with banking permission (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C423427'] },
      () => {
        Orders.resetFiltersIfActive();
        Orders.openVendorFilterModal();
        Orders.searchVendorbyindex(
          'All',
          firstBankingInformation.bankAccountNumber,
          firstOrganization.name,
        );
        Orders.resetFilters();
        cy.wait(4000);
        Orders.openVendorFilterModal();
        Orders.searchVendorbyindex(
          'All',
          secondBankingInformation.bankAccountNumber,
          secondOrganization.name,
        );
      },
    );
  });
});
