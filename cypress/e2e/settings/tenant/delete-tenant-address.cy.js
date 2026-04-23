import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {
      address: Addresses.generateAddressConfig(),
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Addresses.createAddressViaApi(testData.address);
      });

      cy.createTempUser([Permissions.uiSettingsTenantAddresses.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.tenantPath,
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
      'C6733 Delete Tenant address (firebird)',
      { tags: ['extendedPath', 'firebird', 'C6733'] },
      () => {
        // Go to Settings/Tenant/Addresses
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();
        Addresses.verifyAddressInList(testData.address.name);

        // Click the trashcan icon — confirm modal appears
        Addresses.clickDeleteButtonForAddressValue(testData.address.name);
        Addresses.verifyDeleteModalDisplayed();

        // Click Cancel — modal closes, address still present
        Addresses.clickCancelButtonInDeleteModal();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.verifyAddressInList(testData.address.name);

        // Click the trashcan icon again — confirm modal appears
        Addresses.clickDeleteButtonForAddressValue(testData.address.name);
        Addresses.verifyDeleteModalDisplayed();

        // Click Delete — modal closes, address removed
        Addresses.clickDeleteButtonInDeleteModal();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.verifyCalloutForAddressDeletionAppears();
        Addresses.addressRowWithValueIsAbsent(testData.address.name);
      },
    );
  });
});
