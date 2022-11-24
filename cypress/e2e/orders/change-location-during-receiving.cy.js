import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';

describe('orders: Receive piece from Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  let user;
  let orderNumber;
  let orderID;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = response;
      });
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

    cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });

    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
      });
    Orders.searchByParameter('PO number', orderNumber);
    Helper.selectFromResultsList();
    OrderLines.addPOLine();
    OrderLines.fillPOLWithTitleLookUp(item.instanceName);
    OrderLines.backToEditingOrder();
    Orders.openOrder();
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui
    ])
      .then(userProperties => {
        user = userProperties;
        
      cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });

  after(() => {
    Orders.deleteOrderApi(orderID);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
  });

  it('C9177 Change location during receiving (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Helper.selectFromResultsList();
  });
});
