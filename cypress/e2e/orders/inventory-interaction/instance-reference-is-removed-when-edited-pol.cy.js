import { APPLICATION_NAMES, LOCATION_NAMES, ORDER_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const item = {
    instanceName: `AT_C374118_Instance_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let orderNumber;
  let location;
  let instance;

  before(() => {
    cy.getAdminToken()
      .then(() => {
        InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
          if (settings?.length !== 0) {
            InventoryInteractions.setInstanceMatchingSetting({
              ...settings[0],
              value: JSON.stringify({ isInstanceMatchingDisabled: false }),
            });
          }
        });
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          location = res;
        });
        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
        });
        order.vendor = organization.name;
        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
          (instanceResponse) => {
            instance = instanceResponse;
          },
        );
      })
      .then(() => {
        cy.loginAsAdmin();
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.createApprovedOrderForRollover(order, true).then((orderResponse) => {
          order.id = orderResponse.id;
          orderNumber = orderResponse.poNumber;
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
          OrderLines.POLineInfoWithReceiptNotRequiredStatus(location.name);
        });
      });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374118 Instance reference is removed when user confirms changing that will remove the instance UUID from the POL when editing PO line (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374118'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.openPageConnectedInstance();
      InventorySearchAndFilter.varifyInstanceKeyDetails(instance);

      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.openOrderLineEditForm();
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
