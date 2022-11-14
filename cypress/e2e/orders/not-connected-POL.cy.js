import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import NewOrder from '../../support/fragments/orders/newOrder';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import Users from '../../support/fragments/users/users';
import OrderLines from '../../support/fragments/orders/orderLines';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('orders: Test POL', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    poNumberPrefix: 'pref',
    poNumberSuffix: 'suf',
    reEncumber: true,
    manualPo: true,
    approved: true,
  };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  let orderNumber;
  let user;
  let orderID;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = response;
      });
      cy.createOrderApi(order)
          .then((response) => {
            orderNumber = response.body.poNumber;
            orderID = response.body.id;
          });
      InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
      cy.createTempUser([
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersEdit.gui
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

    it('C6648 "Not connected" message appears after changing item details [except tags] (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
      Orders.searchByParameter('PO number', orderNumber);
      FinanceHelp.selectFromResultsList();
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName);
      OrderLines.fillInInvalidDataForPublicationDate();
      OrderLines.clickNotConnectionInfoButton();
    });
});
