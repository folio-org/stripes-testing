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
import RoutingListDetails from '../../support/fragments/orders/routingLists/routingListDetails';
import RoutingListEditForm from '../../support/fragments/orders/routingLists/routingListEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  const routingList = `routingList_1${getRandomPostfix()}`;

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

              OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                testData.orderLineId = orderLineResponse.id;

                Orders.updateOrderViaApi({
                  ...orderResponse,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });

                OrderLineDetails.createRoutingListViaApi(
                  [],
                  routingList,
                  testData.orderLineId,
                ).then((routingListResponse) => {
                  testData.routingListId = routingListResponse;
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([]).then((secondUserProperties) => {
      testData.secondUser = secondUserProperties;
    });
    cy.createTempUser([]).then((thirdUserProperties) => {
      testData.thirdUser = thirdUserProperties;
    });
    cy.createTempUser([]).then((fourthUserProperties) => {
      testData.fourthUser = fourthUserProperties;
    });
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.firstUser = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.firstUser.userId);
    Users.deleteViaApi(testData.secondUser.userId);
    Users.deleteViaApi(testData.thirdUser.userId);
    Users.deleteViaApi(testData.fourthUser.userId);
    RoutingListDetails.deleteRoutingListViaApi(testData.routingListId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C471488 Users added to Routing list from POL are synchronized with users added via Receiving title (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C471488'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.openRoutingListsAccordion();
      OrderLineDetails.openRoutingList(routingList);
      RoutingListDetails.editRoutingList();
      RoutingListEditForm.addUserToRoutingList();
      RoutingListEditForm.assignUser(testData.firstUser.username);
      RoutingListEditForm.checkUserIsAdded(testData.firstUser.username);
      RoutingListEditForm.addUserToRoutingList();
      RoutingListEditForm.assignUser(testData.secondUser.username);
      RoutingListEditForm.checkUserIsAdded(testData.secondUser.username);
      RoutingListEditForm.save();
      RoutingListDetails.closeRoutingListDetails();
      OrderLineDetails.checkAssignedUsersInRoutingList([
        testData.firstUser.username,
        testData.secondUser.username,
      ]);
      OrderLineDetails.backToOrderDetails();
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.openRoutingListsAccordionSection();
      Receiving.verifyRoutingListExists();
      Receiving.openRoutingList(routingList);
      RoutingListDetails.editRoutingList();
      RoutingListEditForm.checkUserIsAdded(testData.firstUser.username);
      RoutingListEditForm.checkUserIsAdded(testData.secondUser.username);
      RoutingListEditForm.unAssignUserFromRoutingList(testData.secondUser.userId);
      RoutingListEditForm.checkUserIsAbsent(testData.secondUser.username);
      RoutingListEditForm.addUserToRoutingList();
      RoutingListEditForm.assignUser(testData.thirdUser.username);
      RoutingListEditForm.checkUserIsAdded(testData.thirdUser.username);
      RoutingListEditForm.addUserToRoutingList();
      RoutingListEditForm.assignUser(testData.fourthUser.username);
      RoutingListEditForm.checkUserIsAdded(testData.fourthUser.username);
      RoutingListEditForm.save();
      RoutingListDetails.closeRoutingListDetails();
      Receiving.verifyRoutingListExists(routingList);
      Receiving.verifyRoutingListWarning();
      Receiving.checkAssignedUsersInRoutingList([
        testData.firstUser.username,
        testData.thirdUser.username,
        testData.fourthUser.username,
      ]);
      Receiving.selectPOLineInReceive();
      OrderLineDetails.waitLoading();
      OrderLineDetails.openRoutingListsAccordion();
      OrderLineDetails.verifyAddingRoutingList(routingList);
      OrderLineDetails.checkAssignedUsersInRoutingList([
        testData.firstUser.username,
        testData.thirdUser.username,
        testData.fourthUser.username,
      ]);
    },
  );
});
