import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
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
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };
  const secondOrder = {
    ...NewOrder.getDefaultOngoingOrder({ orderType: 'One-Time' }),
    approved: true,
  };

  before('Create user, data', () => {
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

            // eslint-disable-next-line no-unused-vars
            const { physical, ...orderLineWithoutPhysical } = BasicOrderLine.getDefaultOrderLine();

            const firstOrderLine = {
              ...orderLineWithoutPhysical,
              acquisitionMethod: params.body.acquisitionMethods[0].id,
              orderFormat: 'Electronic Resource',
              cost: {
                listUnitPriceElectronic: 10.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityElectronic: 1,
              },
              locations: [
                {
                  locationId: locationResp.id,
                  quantity: 1,
                  quantityElectronic: 1,
                },
              ],
              eresource: {
                createInventory: 'Instance, Holding',
                materialType: mtypes.id,
              },
            };
            const secondOrderLine = {
              ...BasicOrderLine.getDefaultOrderLine(),
              orderFormat: 'Other',
              cost: {
                listUnitPrice: 10.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 10.0,
              },
              locations: [
                {
                  locationId: locationResp.id,
                  quantity: 1,
                  quantityPhysical: 1,
                },
              ],
              acquisitionMethod: params.body.acquisitionMethods[0].id,
              physical: {
                createInventory: 'Instance, Holding',
                materialType: mtypes.id,
                materialSupplier: responseOrganizations,
                volumes: [],
              },
            };

            Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
              firstOrder.id = firstOrderResponse.id;
              firstOrderLine.purchaseOrderId = firstOrderResponse.id;
              testData.firstOrderNumber = firstOrderResponse.poNumber;

              OrderLines.createOrderLineViaApi(firstOrderLine);
            });

            Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
              secondOrder.id = secondOrderResponse.id;
              secondOrderLine.purchaseOrderId = secondOrderResponse.id;
              testData.secondOrderNumber = secondOrderResponse.poNumber;

              OrderLines.createOrderLineViaApi(secondOrderLine);
            });
          });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersView.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      },
    );
  });

  after('Delete user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(firstOrder.id);
    Orders.deleteOrderViaApi(secondOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C466239 "Routing lists" accordion is not displayed when Order format = "Electronic Resource" or "Other" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466239'] },
    () => {
      Orders.searchByParameter('PO number', testData.firstOrderNumber);
      Orders.selectFromResultsList(testData.firstOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.checkRoutingListSectionPresence(false);

      Orders.resetFilters();
      Orders.searchByParameter('PO number', testData.secondOrderNumber);
      Orders.selectFromResultsList(testData.secondOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.checkRoutingListSectionPresence(false);
    },
  );
});
