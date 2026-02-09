import { APPLICATION_NAMES, LOCATION_NAMES, ORDER_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const item = {
    instanceName: `AT_C374113_instance_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let orderNumber;
  let location;

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
        testData.instance = instanceResponse;
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
      InstanceRecordView.verifyInstanceRecordViewOpened();
      cy.wait(2000);
      InstanceRecordView.getAssignedHRID().then((hridBefore) => {
        testData.hridBeforeEdit = hridBefore;

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
        InstanceRecordView.verifyInstanceRecordViewOpened();
        cy.wait(2000);
        InstanceRecordView.getAssignedHRID().then((hridAfter) => {
          testData.hridAfterEdit = hridAfter;

          expect(testData.hridAfterEdit).not.to.equal(testData.hridBeforeEdit);
        });
      });
    },
  );
});
