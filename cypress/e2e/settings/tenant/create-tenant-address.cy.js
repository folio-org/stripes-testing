import { including } from '../../../../interactors';
import { Permissions } from '../../../support/dictionary';
import { OrderDetails, OrderEditForm, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      addresses: [
        {
          name: `autotest_address_name_1_${getRandomPostfix()}`,
          address: 'Main Library\nCentral Receiving\n123 Loading Alley\nAtlanta, GA 12345',
        },
        {
          name: `autotest_address_name_2_${getRandomPostfix()}`,
          address: 'Law Library\nShipping Dock\n456 Campus Drive\nAtlanta, GA 67890',
        },
      ],
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization);
      });

      cy.createTempUser([
        Permissions.uiSettingsTenantAddresses.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.tenantPath,
          waiter: TenantPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        testData.addresses.forEach((address) => {
          if (address.id) {
            Addresses.deleteAddressViaApi(address);
          }
        });
        Users.deleteViaApi(testData.user.userId);
        if (testData.orderId) {
          Orders.deleteOrderViaApi(testData.orderId);
        }
      });
    });

    it(
      'C6731 Create a new Tenant address (firebird)',
      { tags: ['extendedPath', 'firebird', 'C6731'] },
      () => {
        // Go to Settings/Tenant/Addresses
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();

        // Click New, add address name, fill in the address, Save — first address
        cy.intercept('POST', '/tenant-addresses').as('createAddress');
        Addresses.createAddressViaUi(testData.addresses[0]);
        cy.wait('@createAddress').then(({ response }) => {
          testData.addresses[0].id = response.body.id;
        });

        // Verify first address appears in the list
        Addresses.verifyAddressInList(testData.addresses[0].name);

        // Click New, add address name, fill in the address, Save — second address
        cy.intercept('POST', '/tenant-addresses').as('createAddress');
        Addresses.createAddressViaUi(testData.addresses[1]);
        cy.wait('@createAddress').then(({ response }) => {
          testData.addresses[1].id = response.body.id;
        });

        // Verify second address appears in the list
        Addresses.verifyAddressInList(testData.addresses[1].name);

        // Go to the Orders app
        cy.visit(TopMenu.ordersPath);
        Orders.waitLoading();

        // Create a new order via Actions => New
        Orders.clickCreateNewOrder();

        // Find the Bill to field and verify the created addresses are in the dropdown
        OrderEditForm.selectDropDownValue('Bill to', testData.addresses[0].name);

        // Find the Ship to field and verify the created addresses are in the dropdown,
        // then assign a different address
        OrderEditForm.selectDropDownValue('Ship to', testData.addresses[1].name);

        // Fill in the Vendor and Order type fields, then Save & Close
        OrderEditForm.fillOrderFields({
          orderInfo: {
            organizationName: testData.organization.name,
            orderType: 'One-time',
          },
        });

        cy.intercept('POST', '/orders/composite-orders**').as('newOrder');
        OrderEditForm.clickSaveButton();
        cy.wait('@newOrder').then(({ response }) => {
          testData.orderId = response.body.id;
        });

        // Verify the order is saved and displays the Bill to and Ship to addresses
        OrderDetails.checkFieldsConditions([
          {
            label: 'Bill to',
            conditions: { value: including(testData.addresses[0].address.split('\n')[0]) },
          },
          {
            label: 'Ship to',
            conditions: { value: including(testData.addresses[1].address.split('\n')[0]) },
          },
        ]);
      },
    );
  });
});
