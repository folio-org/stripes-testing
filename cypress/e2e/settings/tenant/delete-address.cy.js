import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import { Addresses } from '../../../support/fragments/settings/tenant/general';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {
      newAddress: {
        name: `addressName_${getRandomPostfix()}`,
        address: `address_${getRandomPostfix()}`,
      },
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiSettingsTenantAddresses.gui]).then((userProperties) => {
        testData.user = userProperties;
        Addresses.setAddress(testData.newAddress);
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.tenantLocationsPath,
          waiter: TenantPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C374196 Delete Address (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374196'] },
      () => {
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();
        Addresses.clickDeleteButtonForAddressValue(testData.newAddress.name);
        Addresses.verifyDeleteModalDisplayed();
        Addresses.clickCancelButtonInDeleteModal();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.clickDeleteButtonForAddressValue(testData.newAddress.name);
        Addresses.clickDeleteButtonInDeleteModal();
        Addresses.verifyCalloutForAddressDeletionAppears();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.addressRowWithValueIsAbsent(testData.newAddress.address);
      },
    );
  });
});
