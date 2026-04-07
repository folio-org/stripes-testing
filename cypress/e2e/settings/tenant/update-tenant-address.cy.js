import { Permissions } from '../../../support/dictionary';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {
      address: Addresses.generateAddressConfig(),
      user: {},
    };
    const updatedName = `autotest_address_name_upd_${getRandomPostfix()}`;
    const cancelledName = `autotest_address_name_cncl_${getRandomPostfix()}`;
    const unsavedName = `autotest_address_name_unsaved_${getRandomPostfix()}`;

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
        Addresses.deleteAddressViaApi(testData.address);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C6732 Update Tenant address (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C6732'] },
      () => {
        // Go to Settings/Tenant/Addresses
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();
        Addresses.verifyAddressInList(testData.address.name);

        // Click the Edit pencil on the address
        Addresses.clickEditButtonForAddress(testData.address.name);
        Addresses.verifyAddressIsInEditMode();

        // Change the name and press Cancel
        Addresses.fillInEditAddressName(cancelledName);
        Addresses.clickCancelEditButton();

        // Verify address is back to View mode and changes were NOT saved
        Addresses.verifyAddressIsNotInEditMode();
        Addresses.verifyAddressInList(testData.address.name);
        Addresses.addressRowWithValueIsAbsent(cancelledName);

        // Click the Edit pencil again, change the name and press Save
        Addresses.clickEditButtonForAddress(testData.address.name);
        Addresses.verifyAddressIsInEditMode();
        Addresses.fillInEditAddressName(updatedName);
        Addresses.clickSaveEditButton();

        // Verify address is back to View mode and the new name was saved
        Addresses.verifyAddressIsNotInEditMode();
        Addresses.verifyAddressInList(updatedName);
        Addresses.addressRowWithValueIsAbsent(testData.address.name);

        // Click the Edit pencil again, change the name, then click "Tenant" in the nav to leave
        Addresses.clickEditButtonForAddress(updatedName);
        Addresses.verifyAddressIsInEditMode();
        Addresses.fillInEditAddressName(unsavedName);
        TenantPane.goToTenantTab();

        // Verify "Are you sure?" modal appears with all expected elements
        AreYouSureModal.verifyAreYouSureForm(true);

        // Click "Keep editing" and verify modal closes and edit mode is preserved
        AreYouSureModal.clickKeepEditingButton();
        AreYouSureModal.verifyAreYouSureForm(false);
        Addresses.verifyAddressIsInEditMode();

        // Change the name again, click "Tenant" in the nav, then click "Close without saving"
        Addresses.fillInEditAddressName(unsavedName);
        TenantPane.goToTenantTab();
        AreYouSureModal.verifyAreYouSureForm(true);
        AreYouSureModal.clickCloseWithoutSavingButton();
        AreYouSureModal.verifyAreYouSureForm(false);

        // Click "Addresses" in the Tenant pane — verify saved name is shown, unsaved name is not
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();
        Addresses.verifyAddressInList(updatedName);
        Addresses.addressRowWithValueIsAbsent(unsavedName);
      },
    );
  });
});
