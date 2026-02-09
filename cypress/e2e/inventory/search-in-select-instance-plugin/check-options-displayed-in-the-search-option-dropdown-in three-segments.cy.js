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
    const defaultSearchOptionHoldings = 'Keyword (title, contributor, identifier, HRID, UUID)';
    const defaultSearchOptionItem = 'Keyword (title, contributor, identifier, HRID, UUID)';
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

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiOrdersCreate.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          });
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          OrderLines.addPOLine();
          OrderLines.clickTitleLookUp();
          InventorySearchAndFilter.instanceTabIsDefault();
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C736720 Find Instance plugin | Check what options displayed in the search option dropdown in three segments: Instance, Holdings, Item (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C736720'] },
      () => {
        // 1 Click on the Search option dropdown placed at the "Search & filter" pane
        SelectInstanceModal.verifyInstanceSearchOptionsInOrder();

        // 2 Click on the "Holdings" tab in "Instance|Holdings|Item" toggle
        SelectInstanceModal.switchToHoldings();
        cy.wait(1000);
        SelectInstanceModal.checkDefaultSearchOptionSelected(defaultSearchOptionHoldings);
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();

        // 3 Click on the Search option dropdown placed at the "Search & filter" pane
        SelectInstanceModal.verifyHoldingsSearchOptionsInOrder();

        // 4 Click on the "Item" tab in "Instance|Holdings|Item" toggle
        SelectInstanceModal.switchToItem();
        cy.wait(1000);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(defaultSearchOptionItem);
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();

        // 5 Click on the Search option dropdown placed at the "Search & filter" pane
        SelectInstanceModal.verifyItemSearchOptionsInOrder();
      },
    );
  });
});
