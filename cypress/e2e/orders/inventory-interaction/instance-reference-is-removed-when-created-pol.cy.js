import { APPLICATION_NAMES, LOCATION_NAMES, ORDER_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
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
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let orderNumber;
  let location;
  let instance;

  before(() => {
    cy.getAdminToken();
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
      order.vendor = organization.id;

      Orders.createOrderViaApi(order).then((orderResponse) => {
        order.id = orderResponse.id;
        orderNumber = orderResponse.poNumber;
      });
    });

    const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
      (instanceResponse) => {
        instance = instanceResponse;
      },
    );

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password);
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
    { tags: ['extendedPath', 'thunderjet', 'C374113'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
      OrderLines.openPageConnectedInstance();
      InventorySearchAndFilter.verifyInstanceKeyDetails(instance);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
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
      InventorySearchAndFilter.verifyInstanceKeyDetails(instance);
    },
  );
});
