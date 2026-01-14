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
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
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
    cy.log('Get admin token (1)...');
    cy.getAdminToken();
    cy.log('Admin token received.');

    InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
      if (settings?.length !== 0) {
        InventoryInteractions.setInstanceMatchingSetting({
          ...settings[0],
          value: JSON.stringify({ isInstanceMatchingDisabled: false }),
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

    cy.log('Logged in as admin.');
    cy.loginAsAdmin({
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.log('Logged in as admin.');

    cy.log('Get admin token (2)...');
    cy.getAdminToken();
    cy.log('Admin token received.');

    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
    });

    const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
      (instanceResponse) => {
        instance = instanceResponse;
      },
    );

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.log('Login as admin...');
    cy.loginAsAdmin({
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.log('Logged in as admin.');

    cy.log('Get admin token...');
    cy.getAdminToken();
    cy.log('Admin token received.');

    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    cy.wait(6000);
    Orders.deleteOrderViaApi(firstOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    NewLocation.deleteViaApi(location.id);

    InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
      if (settings?.length !== 0) {
        InventoryInteractions.setInstanceMatchingSetting({
          ...settings[0],
          value: JSON.stringify({ isInstanceMatchingDisabled: true }),
        });
      }
    });

    Users.deleteViaApi(user.userId);
  });

  it(
    'C374113 Instance reference is removed when user confirms changing that will remove the instance UUID from the POL when creating PO line (thunderjet) (TaaS)',
    { tags: ['extendedPathFlaky', 'thunderjet', 'C374113'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
      OrderLines.openPageConnectedInstance();
      InventorySearchAndFilter.varifyInstanceKeyDetails(instance);
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName);
      OrderLines.fillInInvalidDataForPublicationDate();
      OrderLines.removeInstanceConnectionModal();
      OrderLines.POLineInfoWithReceiptNotRequiredStatuswithSelectLocation(location.name);
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
