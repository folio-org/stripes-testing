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
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import NewRoutingList from '../../support/fragments/orders/routingLists/newRoutingList';
import RoutingListDetails from '../../support/fragments/orders/routingLists/routingListDetails';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
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
  const notes = `notes${getRandomPostfix()}`;

  before('Set up test data', () => {
    cy.getAdminToken();
    cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
      cy.getBookMaterialType().then((mtypes) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((params) => {
          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
            order.vendor = organization.id;
            const orderLine = {
              ...BasicOrderLine.defaultOrderLine,
              cost: {
                listUnitPrice: 10.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 2,
                poLineEstimatedPrice: 10.0,
              },
              locations: [{ locationId: locationResp.id, quantity: 2, quantityPhysical: 2 }],
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
              orderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                testData.orderLineId = orderLineResponse.id;

                Orders.updateOrderViaApi({
                  ...orderResponse,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
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
        testData.orderLineId,
      ).then((routingListResponse) => {
        testData.routingListId1 = routingListResponse;
      });

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    RoutingListDetails.deleteRoutingListViaApi(testData.routingListId1);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C468148 Create second routing list for a PO line with quantity > 1 (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468148'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.verifyAddingRoutingList(routingList1);
      OrderLineDetails.addRoutingListByActions();
      NewRoutingList.fillInRoutingListInfoWithNotesAndSave(routingList2, notes);
      OrderLineDetails.verifyAddingRoutingList(routingList1);
      OrderLineDetails.verifyAddingRoutingList(routingList2);
      OrderLineDetails.openRoutingList(routingList2);
      RoutingListDetails.checkRoutingListNameDetails(routingList2);
      RoutingListDetails.closeRoutingListDetails();
      OrderLineDetails.verifyRoutingListAccordionRecordCount(2);
      OrderLineDetails.verifyAddingRoutingList(routingList1);
      OrderLineDetails.verifyAddingRoutingList(routingList2);
      OrderLineDetails.verifyRoutingListTableColumns();
      OrderLineDetails.verifyAddRoutingListInactive();
    },
  );
});
