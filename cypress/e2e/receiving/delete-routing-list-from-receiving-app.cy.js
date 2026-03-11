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
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const testData = {};
  const order = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const routingList = `routingList_1_${getRandomPostfix()}`;
  const notes = `notes_${getRandomPostfix()}`;

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
                listUnitPrice: 10.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 10.0,
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
              NewRoutingList.fillInRoutingListInfoWithNotesAndSave(routingList, notes);
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
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C468209 Delete routing list from "Receiving" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468209'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.openRoutingList(routingList);
      RoutingListDetails.deleteRoutingList();
      Receiving.openRoutingListsAccordionSection();
      Receiving.addRoutingListButtonExist();
      Receiving.selectPOLineInReceive();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRoutingListSectionCounter('0');
      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkNoRoutingListsText();
    },
  );
});
