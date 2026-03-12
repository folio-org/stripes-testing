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
              orderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                testData.orderLineId = orderLineResponse.id;
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

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((secondUserProperties) => {
      testData.secondUser = secondUserProperties;

      cy.getUsers({ limit: 1, query: `username=${secondUserProperties.username}` }).then(
        (users) => {
          cy.updateUser({
            ...users[0],
            personal: {
              ...users[0].personal,
              addresses: [
                {
                  addressLine1: 'Broadway',
                  city: 'New York',
                  // should be changed to existing on environment value
                  addressTypeId: '93d3d88d-499b-45d0-9bc7-ac73c3a19880',
                  countryId: 'US',
                },
              ],
            },
          });
        },
      );
    });
    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.firstUser = userProperties;

      OrderLineDetails.createRoutingListViaApi([], routingList, testData.orderLineId).then(
        (routingListResponse) => {
          testData.routingListId = routingListResponse;
        },
      );

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.firstUser.userId);
    Users.deleteViaApi(testData.secondUser.userId);
    RoutingListDetails.deleteRoutingListViaApi(testData.routingListId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C468163 Manage user assignments in routing list from "Orders" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468163'] },
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
      OrderLineDetails.openRoutingList(routingList);
      RoutingListDetails.editRoutingList();
      RoutingListEditForm.unAssignAllUsers();
      RoutingListEditForm.save();
      RoutingListDetails.closeRoutingListDetails();
      OrderLineDetails.checkAssignedUsersInRoutingList([]);
    },
  );
});
