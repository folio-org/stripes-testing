import permissions from '../../../support/dictionary/permissions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };
    let orderNumber;
    let user;
    let orderID;
    const lccnOption = 'LCCN, normalized';

    before(() => {
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
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersView.gui,
        permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C442841 "LCCN, normalized" search option is displayed in the search option dropdown of "Find Instance" plugin (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C442841'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.instanceTabIsDefault();
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.checkSearchOptionIncluded(lccnOption);
        InventorySearchAndFilter.switchToHoldings();
        SelectInstanceModal.checkDefaultSearchOptionSelected();
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.checkSearchOptionIncluded(lccnOption, false);
        InventorySearchAndFilter.switchToItem();
        SelectInstanceModal.checkDefaultSearchOptionSelected();
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();
        SelectInstanceModal.clickSearchOptionSelect();
        SelectInstanceModal.checkSearchOptionIncluded(lccnOption, false);
      },
    );
  });
});
