import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      searchQuery: '333.2.221.1.3',
      classificationOption: 'Classification, normalized',
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };
    let orderNumber;
    let orderID;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        order.vendor = response;
      });

      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersCreate.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466163 Find Instance plugin | No results found when searching by "Classification, normalized" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466163'] },
      () => {
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.chooseSearchOption(testData.classificationOption);
        SelectInstanceModal.searchByName(testData.searchQuery);
        SelectInstanceModal.checkNoRecordsFound(testData.searchQuery);
      },
    );
  });
});
