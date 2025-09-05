import { ORDER_STATUSES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import InventoryInteractionsDefaults from '../../../support/fragments/settings/orders/inventoryInteractionsDefaults';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  let instance;

  before(() => {
    cy.getAdminToken();
    InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
      query: '(module==ORDERS and configName==disableInstanceMatching)',
    }).then((body) => {
      if (body.configs.length !== 0) {
        const id = body.configs[0].id;
        InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
          id,
          module: 'ORDERS',
          configName: 'disableInstanceMatching',
          value: '{"isInstanceMatchingDisabled":true}',
        });
      }
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
    });
    firstOrder.vendor = organization.name;
    const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
      (instanceResponse) => {
        instance = instanceResponse;
      },
    );
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    }, 20_000);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
      OrderLines.POLineInfoWithReceiptNotRequiredStatus(location.name);
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      }, 20_000);
    });
  });

  after(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    }, 20_000);
    cy.getAdminToken();
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    cy.wait(6000);
    Orders.deleteOrderViaApi(firstOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    NewLocation.deleteViaApi(location.id);
    InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
      query: '(module==ORDERS and configName==disableInstanceMatching)',
    }).then((body) => {
      if (body.configs.length !== 0) {
        const id = body.configs[0].id;
        InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
          id,
          module: 'ORDERS',
          configName: 'disableInstanceMatching',
          value: '{"isInstanceMatchingDisabled":false}',
        });
      }
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374118 Instance reference is removed when user confirms changing that will remove the instance UUID from the POL when editing PO line (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.openPageConnectedInstance();
      InventorySearchAndFilter.varifyInstanceKeyDetails(instance);
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.fillInInvalidDataForPublicationDate();
      OrderLines.removeInstanceConnectionModal();
      OrderLines.saveOrderLine();
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderLines.selectPOLInOrder();
      OrderLines.openInstanceInPOL(item.instanceName);
      instance.hrid = instance.hrid.replace(/\d+$/, (match) => {
        let numericPart = Number(match);
        numericPart += 1;
        return numericPart.toString().padStart(match.length, '0');
      });
      InventorySearchAndFilter.varifyInstanceKeyDetails(instance);
    },
  );
});
