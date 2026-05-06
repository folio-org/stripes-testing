import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Tenant', () => {
  describe('Settings', () => {
    const addressName = `autotest_address_name_${randomFourDigitNumber()}`;
    const testData = {
      address: Addresses.generateAddressConfig({ name: addressName }),
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
        Addresses.verifyAddressInList(addressName);

        // Click the trashcan icon — confirm modal appears
        Addresses.clickDeleteButtonForAddressValue(addressName);
        Addresses.verifyDeleteModalDisplayed();

        // Click Cancel — modal closes, address still present
        Addresses.clickCancelButtonInDeleteModal();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.verifyAddressInList(addressName);

        // Click the trashcan icon again — confirm modal appears
        Addresses.clickDeleteButtonForAddressValue(addressName);
        Addresses.verifyDeleteModalDisplayed();

        // Click Delete — modal closes, address removed
        Addresses.clickDeleteButtonInDeleteModal();
        Addresses.verifyDeleteModalIsNotDisplayed();
        Addresses.verifyCalloutForAddressDeletionAppears();
        Addresses.addressRowWithValueIsAbsent(addressName);
      },
    );
  });
});
