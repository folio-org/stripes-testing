import uuid from 'uuid';
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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {};
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    id: uuid(),
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before('Setup test data', () => {
    cy.getAdminToken();
    cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
      cy.getBookMaterialType().then((mtypes) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((params) => {
          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
            firstOrder.vendor = organization.id;
            secondOrder.vendor = organization.id;

            const firstOrderLine = {
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
            const secondOrderLine = {
              ...BasicOrderLine.defaultOrderLine,
              id: uuid(),
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
            Orders.createOrderViaApi(firstOrder).then((orderResponse) => {
              firstOrder.id = orderResponse.id;
              testData.firstOrderNumber = orderResponse.poNumber;
              firstOrderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(firstOrderLine);
              Orders.updateOrderViaApi({
                ...orderResponse,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            });
            Orders.createOrderViaApi(secondOrder).then((orderResponse) => {
              secondOrder.id = orderResponse.id;
              testData.secondOrderNumber = orderResponse.poNumber;
              secondOrderLine.purchaseOrderId = orderResponse.id;

              OrderLines.createOrderLineViaApi(secondOrderLine);
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
      Permissions.uiOrdersView.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiSettingsOrdersCanViewAllSettings.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Delete user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(firstOrder.id);
    Orders.deleteOrderViaApi(secondOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C466242 "Routing lists" accordion is collapsed when PO line does not have related Routing lists and Order format = "Physical Resource" or "P/E Mix" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466242'] },
    () => {
      Orders.searchByParameter('PO number', testData.firstOrderNumber);
      Orders.selectFromResultsList(testData.firstOrderNumber);
      cy.wait(4000);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRoutingListSectionPresence();
      OrderLineDetails.checkRoutingListSectionCollapsed();
      OrderLineDetails.checkRoutingListSectionCounter('0');

      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkRoutingListSectionExpanded();
      OrderLineDetails.checkNoRoutingListsText();

      Orders.resetFilters();
      Orders.searchByParameter('PO number', testData.secondOrderNumber);
      Orders.selectFromResultsList(testData.secondOrderNumber);
      cy.wait(2000);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRoutingListSectionPresence();
      OrderLineDetails.checkRoutingListSectionCollapsed();
      OrderLineDetails.checkRoutingListSectionCounter('0');

      OrderLineDetails.expandRoutingListSection();
      OrderLineDetails.checkRoutingListSectionExpanded();
      OrderLineDetails.checkNoRoutingListsText();
    },
  );
});
