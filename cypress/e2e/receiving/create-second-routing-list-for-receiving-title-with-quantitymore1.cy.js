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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const testData = {};
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  const routingList1 = `routingList_1_${getRandomPostfix()}`;
  const notes1 = `notes${getRandomPostfix()}`;
  const routingList2 = `routingList_2_${getRandomPostfix()}`;
  const notes2 = `notes${getRandomPostfix()}`;

  before(() => {
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

              OrderLines.createOrderLineViaApi(orderLine);
              Orders.updateOrderViaApi({
                ...orderResponse,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
              cy.loginAsAdmin();
              TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.ORDERS);
              Orders.selectOrdersPane();
              Orders.waitLoading();
              Orders.searchByParameter('PO number', testData.orderNumber);
              Orders.selectFromResultsList(testData.orderNumber);
              Orders.receiveOrderViaActions();
              Receiving.selectLinkFromResultsList();
              Receiving.openRoutingListsAccordionSection();
              Receiving.clickAddRoutingListButton();
              NewRoutingList.fillInRoutingListInfoWithNotesAndSave(routingList1, notes1);
              cy.wait(2000);
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
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C468206 Create second routing list for a Receiving title with quantity > 1 (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468206'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.addRoutingListByActions();
      NewRoutingList.fillInRoutingListInfoWithNotesAndSave(routingList2, notes2);
      Receiving.verifyRoutingListExists(routingList1);
      Receiving.verifyRoutingListExists(routingList2);
      Receiving.addRoutingListIsDisabled();
      Receiving.selectPOLineInReceive();
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyAddingRoutingList(routingList1);
      OrderLineDetails.verifyAddingRoutingList(routingList2);
      OrderLineDetails.addRoutingListIsDisabled();
    },
  );
});
