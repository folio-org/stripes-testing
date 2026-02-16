import { APPLICATION_NAMES, LOCATION_NAMES, ORDER_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
      approved: true,
    },
  };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization);
    cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locationResp) => {
      testData.location = locationResp;
    });
    InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
      testData.instance = instanceData;
    });
    Orders.createOrderViaApi(testData.order).then((orderResp) => {
      testData.order.id = orderResp.id;
      testData.orderNumber = orderResp.poNumber;
    });
    InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
      if (settings?.length !== 0) {
        InventoryInteractions.setInstanceMatchingSetting({
          ...settings[0],
          value: JSON.stringify({ isInstanceMatchingDisabled: false }),
        });
      }
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C374119 Instance reference is NOT removed when user does not confirm changing that will remove the instance UUID from the POL when creating PO line (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374119'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(testData.instance.instanceTitle, 0);
      OrderLines.openPageConnectedInstance();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      cy.wait(2000);
      InstanceRecordView.getAssignedHRID().then((hridBefore) => {
        testData.hridBeforeEdit = hridBefore;

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP(testData.instance.instanceTitle);
        OrderLines.fillInInvalidDataForPublicationDate();
        OrderLines.cancelRemoveInstanceConnectionModal();
        OrderLines.POLineInfoWithReceiptNotRequiredStatus(testData.location.name);
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
        OrderLines.selectPOLInOrder();
        OrderLines.openInstanceInPOL(testData.instance.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        cy.wait(2000);
        InstanceRecordView.getAssignedHRID().then((hridAfter) => {
          testData.hridAfterEdit = hridAfter;

          expect(testData.hridAfterEdit).equal(testData.hridBeforeEdit);
        });
      });
    },
  );
});
