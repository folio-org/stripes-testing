import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import { NewOrder, BasicOrderLine, Orders } from '../../../support/fragments/orders';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { ServicePoints } from '../../../support/fragments/settings/tenant';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ORDER_STATUSES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import NewRequest from '../../../support/fragments/requests/newRequest';
import UserEdit from '../../../support/fragments/users/userEdit';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Requests from '../../../support/fragments/requests/requests';

describe('Orders: Receiving and Check-in', () => {
  const testData = {
    servicePointName: 'Circ Desk 2',
    organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
    order: {},
    orderLine: {},
    integration: {},
    integrationName: '',
    user: {},
    caption: 'autotestCaption',
    itemBarcode: uuid(),
  };

  before(() => {
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
              cy.getMaterialTypes({ limit: 1 }).then(({ id: materialTypeId }) => {
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
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersView.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiRequestsCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointViaApi(
        testData.effectiveLocationServicePoint.id,
        testData.user.userId,
        testData.effectiveLocationServicePoint.id,
      );
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
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
    'C402758 Receiving an item with open title level request (thunderjet) (TaaS)',
    { tags: [testType.extendedPath, devTeams.thunderjet] },
    () => {
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLines.verifyPOLDetailsIsOpened();

      const InventoryInstanceDetails = OrderLineDetails.openInventoryItem();
      InventoryInstanceDetails.openHoldings(testData.location.name);
      InventoryInstanceDetails.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstanceDetails.getAssignedHRID().then((hrid) => {
        testData.instanceHrid = hrid;

        InventoryInstanceDetails.openItemByBarcode('No barcode');
        ItemRecordView.createNewRequest();
        NewRequest.checkRequestsFields();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enableTitleLevelRequest();
        NewRequest.checkTLRRequestsFields(testData.instanceHrid);
        NewRequest.enterRequesterInfoWithRequestType(
          {
            requesterBarcode: testData.user.barcode,
            pickupServicePoint: testData.effectiveLocationServicePoint.name,
          },
          REQUEST_TYPES.RECALL,
        );
        NewRequest.saveRequestAndClose();
        cy.intercept('POST', 'circulation/requests').as('createRequest');
        cy.wait('@createRequest').then((intercept) => {
          testData.requestId = intercept.response.body.id;
          cy.location('pathname').should('eq', `/requests/view/${testData.requestId}`);
        });
        NewRequest.waitLoading();
        NewRequest.verifyRequestSuccessfullyCreated(testData.user.username);
      });

      cy.visit(TopMenu.ordersPath);
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLines.openReceiving();
      Receiving.waitLoading();
      Receiving.selectReceivingItem();
      Receiving.verifyDetailsOpened();
      Receiving.verifyRequestIsCreated();
      Receiving.receivePiece(0, testData.caption, testData.itemBarcode);
      Receiving.verifyOpenedRequestsModal(testData.orderLine.titleOrPackage, testData.itemBarcode);
      Receiving.closeOpenedRequestModal();
      Receiving.checkReceivedPiece(0, testData.caption, testData.itemBarcode);
    },
  );
});
