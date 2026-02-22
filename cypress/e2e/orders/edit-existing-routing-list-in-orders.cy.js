import uuid from 'uuid';
import { calloutTypes } from '../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import RoutingListDetails from '../../support/fragments/orders/routingLists/routingListDetails';
import RoutingListEditForm from '../../support/fragments/orders/routingLists/routingListEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};
  const order = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const routingList1 = `routingList_1${getRandomPostfix()}`;
  const routingList2 = `routingList_2${getRandomPostfix()}`;
  const routingList3 = `routingList_3${getRandomPostfix()}`;

  before('Setup test data', () => {
    cy.getAdminToken();
    cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
      cy.getBookMaterialType().then((mtypes) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((params) => {
          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
            order.vendor = organization.id;
            const firstOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              cost: {
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                quantityElectronic: 1,
                listUnitPriceElectronic: 5,
                listUnitPrice: 5,
              },
              orderFormat: 'P/E Mix',
              eresource: {
                createInventory: 'Instance, Holding',
                accessProvider: organization.id,
              },
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: mtypes.id,
              },
              locations: [
                {
                  locationId: locationResp.id,
                  quantityPhysical: 1,
                  quantityElectronic: 1,
                },
              ],
              acquisitionMethod: params.body.acquisitionMethods[0].id,
            };
            const secondOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
              cost: {
                listUnitPrice: 5.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 5.0,
              },
              locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
              acquisitionMethod: params.body.acquisitionMethods[0].id,
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: mtypes.id,
                materialSupplier: responseOrganizations,
                volumes: [],
              },
            };
            Orders.createOrderViaApi(order).then((orderResponse) => {
              order.id = orderResponse.id;
              testData.orderNumber = orderResponse.poNumber;
              firstOrderLine.purchaseOrderId = orderResponse.id;
              secondOrderLine.purchaseOrderId = orderResponse.id;

              OrderLinesLimit.setPOLLimit(2);
              OrderLines.createOrderLineViaApi(firstOrderLine).then((firstOrderLineResponse) => {
                testData.firstOrderLineId = firstOrderLineResponse.id;
              });
              OrderLines.createOrderLineViaApi(secondOrderLine).then((secondOrderLineResponse) => {
                testData.secondOrderLineId = secondOrderLineResponse.id;
              });

              Orders.updateOrderViaApi({
                ...orderResponse,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.getAdminToken();
      OrderLineDetails.createRoutingListViaApi(
        [userProperties.userId],
        routingList1,
        testData.firstOrderLineId,
      ).then((routingListResponse) => {
        testData.routingListId1 = routingListResponse;
      });
      OrderLineDetails.createRoutingListViaApi(
        [userProperties.userId],
        routingList2,
        testData.secondOrderLineId,
      ).then((routingListResponse) => {
        testData.routingListId2 = routingListResponse;
      });

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Cleanup test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    RoutingListDetails.deleteRoutingListViaApi(testData.routingListId1);
    RoutingListDetails.deleteRoutingListViaApi(testData.routingListId2);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C468149 Edit existing routing list in "Orders" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468149'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.addRoutingListIsDisabled();
      OrderLineDetails.openRoutingList(routingList1);
      RoutingListDetails.checkRoutingListNameDetails(routingList1);
      RoutingListDetails.editRoutingList();
      RoutingListEditForm.fillInRoutingListInfoAndSave('');
      RoutingListEditForm.verifyNameFieldWithError('Required!');
      RoutingListEditForm.fillInRoutingListInfoAndSave(routingList2);
      InteractorsTools.checkCalloutMessage('Name must be unique', calloutTypes.error);
      InteractorsTools.closeCalloutMessage();
      RoutingListEditForm.fillInRoutingListInfoAndSave(routingList3);
      InteractorsTools.checkCalloutMessage('The Routing list was successfully updated.');
      RoutingListDetails.closeRoutingListDetails();
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyAddingRoutingList(routingList3);
      OrderLineDetails.addRoutingListIsDisabled();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openReceivingsPage();
      Receiving.selectFromResultsListByPolNumber(`${testData.orderNumber}-1`);
      Receiving.waitLoading();
      Receiving.verifyRoutingListWarning();
      Receiving.verifyRoutingListExists(routingList3);
    },
  );
});
