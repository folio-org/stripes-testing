import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  REQUEST_TYPES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewRequest from '../../../support/fragments/requests/newRequest';
import Requests from '../../../support/fragments/requests/requests';
import { ServicePoints } from '../../../support/fragments/settings/tenant';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const testData = {
      servicePointName: 'Circ Desk 2',
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      order: {},
      orderLine: {},
      integration: {},
      integrationName: '',
      location: {},
      user: {},
      displaySummary: 'autotestCaption',
      itemBarcode: uuid(),
    };

    before('create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getViaApi({ limit: 1, query: `name=="${testData.servicePointName}"` }).then(
          (servicePoints) => {
            testData.effectiveLocationServicePoint = servicePoints[0];
            NewLocation.createViaApi(
              NewLocation.getDefaultLocation(testData.effectiveLocationServicePoint.id),
            )
              .then((locationResponse) => {
                testData.location = locationResponse;
                Organizations.createOrganizationViaApi(testData.organization).then(
                  (organizationsResponse) => {
                    testData.organization.id = organizationsResponse;
                    testData.order.vendor = organizationsResponse;
                  },
                );
              })
              .then(() => {
                cy.getDefaultMaterialType().then(({ id: materialTypeId }) => {
                  testData.order = NewOrder.getDefaultOrder({
                    vendorId: testData.organization.id,
                    manualPo: false,
                  });
                  testData.orderLine = {
                    ...BasicOrderLine.getDefaultOrderLine(),
                    cost: {
                      listUnitPrice: 10,
                      currency: 'USD',
                      discountType: 'percentage',
                      quantityPhysical: 1,
                    },
                    orderFormat: 'Other',
                    physical: {
                      createInventory: 'Instance, Holding, Item',
                      materialType: materialTypeId,
                    },
                    locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
                  };

                  Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
                    (order) => {
                      testData.order = order;

                      Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
                    },
                  );
                });
              });
          },
        );
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
        Permissions.uiRequestsCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        UserEdit.addServicePointViaApi(
          testData.effectiveLocationServicePoint.id,
          testData.user.userId,
          testData.effectiveLocationServicePoint.id,
        );
        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: testData.effectiveLocationServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.effectiveLocationServicePoint.id,
      ]);
      Orders.deleteOrderViaApi(testData.order.id);
      Requests.deleteRequestViaApi(testData.requestId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C402765 Receiving an item with an open item level request (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C402765'] },
      () => {
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
        OrderLines.verifyPOLDetailsIsOpened();

        const InventoryInstanceDetails = OrderLineDetails.openInventoryItem();
        InventoryInstanceDetails.openHoldings(testData.location.name);
        InventoryInstanceDetails.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);
        InventoryInstanceDetails.openItemByBarcode('No barcode');
        InventoryItems.edit();
        ItemRecordEdit.waitLoading(testData.orderLine.titleOrPackage);
        ItemRecordEdit.addBarcode(testData.itemBarcode);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(testData.itemBarcode);
        ItemRecordView.createNewRequest();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.checkRequestsFields();
        NewRequest.enterRequesterInfoWithRequestType(
          {
            requesterBarcode: testData.user.barcode,
            pickupServicePoint: testData.effectiveLocationServicePoint.name,
          },
          REQUEST_TYPES.RECALL,
        );
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then((intercept) => {
          testData.requestId = intercept.response.body.id;
          cy.location('pathname').should('eq', `/requests/view/${testData.requestId}`);
        });
        NewRequest.waitLoading();
        NewRequest.verifyRequestSuccessfullyCreated(testData.user.username);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.resetFilters();
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
        OrderLines.openReceiving();
        Receiving.waitLoading();
        Receiving.selectReceivingItem();
        Receiving.verifyDetailsOpened();
        Receiving.verifyRequestIsCreated();
        Receiving.receivePieceWithBarcode(0, testData.displaySummary);
        Receiving.verifyOpenedRequestsModal(
          testData.orderLine.titleOrPackage,
          testData.itemBarcode,
        );
        Receiving.closeOpenedRequestModal();
        Receiving.checkReceivedPiece(0, testData.displaySummary, testData.itemBarcode);
      },
    );
  });
});
