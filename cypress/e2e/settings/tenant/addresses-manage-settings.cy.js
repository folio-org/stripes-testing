import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AddressesConfig from '../../../support/fragments/settings/tenant/addressesConfig';

describe('Settings: Tenant', () => {
  const testData = {
    address: {
      name: `autotest_address_name_${getRandomPostfix()}`,
      address: `autotest_address_value_${getRandomPostfix()}`,
    },
    updatedAddress: {
      name: `autotest_address_name_upd_${getRandomPostfix()}`,
      address: `autotest_address_value_upd_${getRandomPostfix()}`,
    },
    user: {},
  };

  before('Create test data', () => {
    // Capability set "Settings - UI-Tenant-Settings Settings Addresses - Manage"
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
      // Failsafe: delete the address if it still exists in case the test failed before the delete step
      [testData.address.name, testData.updatedAddress.name].forEach((name) => {
        AddressesConfig.getAddressesViaApi({ query: `name=="${name}"` }).then((addresses) => {
          if (addresses.length) {
            Addresses.deleteAddressViaApi({ id: addresses[0].id });
          }
        });
      });
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C2374 Settings - UI-Tenant-Settings Settings Addresses - Manage (firebird)',
    { tags: ['extendedPath', 'firebird', 'C2374'] },
    () => {
      // Step 6: Open Settings App and navigate to Tenant settings --> Addresses
      // 7.1) See Addresses menu option
      // 7.2) See Addresses list in the right pane
      TenantPane.selectTenant(TENANTS.ADDRESSES);
      Addresses.waitLoading();

      // 7.3) CREATE: Add a new Address line item
      Addresses.createAddressViaUi(testData.address);
      Addresses.verifyAddressInList(testData.address.name);

      // READ: Verify newly-created address is shown in the list
      Addresses.verifyAddressInList(testData.address.name);

      // UPDATE: Edit the created address (name + address details), then Save
      Addresses.clickEditButtonForAddress(testData.address.name);
      Addresses.verifyAddressIsInEditMode();
      Addresses.fillInEditAddressName(testData.updatedAddress.name);
      Addresses.fillInEditAddressDetails(testData.updatedAddress.address);
      Addresses.clickSaveEditButton();
      Addresses.verifyAddressIsNotInEditMode();
      Addresses.verifyAddressInList(testData.updatedAddress.name);
      Addresses.addressRowWithValueIsAbsent(testData.address.name);

      // DELETE: Remove the address through the trashcan -> confirm modal -> Delete
      Addresses.clickDeleteButtonForAddressValue(testData.updatedAddress.name);
      Addresses.verifyDeleteModalDisplayed();
      Addresses.clickDeleteButtonInDeleteModal();
      Addresses.verifyDeleteModalIsNotDisplayed();
      Addresses.verifyCalloutForAddressDeletionAppears();
      Addresses.addressRowWithValueIsAbsent(testData.updatedAddress.name);
    },
  );
});
