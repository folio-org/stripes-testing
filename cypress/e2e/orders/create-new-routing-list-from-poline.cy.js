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
import NewRoutingList from '../../support/fragments/orders/routingLists/newRoutingList';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
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
  const routingList = `routingList_1${getRandomPostfix()}`;

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
            const orderLine = {
              ...BasicOrderLine.defaultOrderLine,
              cost: {
                listUnitPrice: 100.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 100.0,
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
              orderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(orderLine);
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
      cy.login(userProperties.username, userProperties.password);
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C466265 Create new routing list from PO line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466265'] },
    () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      OrderLines.searchByParameter('Keyword', `${testData.orderNumber}-1`);
      OrderLines.selectOrderline(`${testData.orderNumber}-1`);
      OrderLineDetails.openRoutingListsAccordion();
      OrderLineDetails.addRoutingListButtonExist();
      OrderLineDetails.addRoutingList();
      NewRoutingList.fillInRoutingListAndCancel(routingList);
      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkNoRoutingListsText();
      OrderLineDetails.addRoutingList();
      NewRoutingList.fillInRoutingListInfoAndSave(routingList);
      OrderLineDetails.verifyAddingRoutingList(routingList);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderDetails.openReceivingsPage();
      Receiving.selectLinkFromResultsList();
      Receiving.waitLoading();
      Receiving.verifyRoutingListWarning();
      Receiving.verifyRoutingListExists(routingList);
    },
  );
});
