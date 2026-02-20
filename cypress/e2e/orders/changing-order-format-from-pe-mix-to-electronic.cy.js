import {
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_FORMAT_NAMES,
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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const testData = {};
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before('Setup test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgResp) => {
      organization.id = orgResp;

      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          cy.getBookMaterialType().then((mtypeResp) => {
            testData.order = NewOrder.getDefaultOrder({ vendorId: organization.id });
            testData.orderLine = {
              ...BasicOrderLine.getDefaultOrderLine(),
              cost: {
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                quantityElectronic: 1,
                listUnitPriceElectronic: 10,
                listUnitPrice: 10,
              },
              orderFormat: 'P/E Mix',
              eresource: {
                createInventory: 'Instance, Holding',
                accessProvider: organization.id,
              },
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: mtypeResp.id,
              },
              locations: [
                {
                  locationId: locationResp.id,
                  quantityPhysical: 1,
                  quantityElectronic: 1,
                },
              ],
            };

            Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
              (orderResponse) => {
                testData.order = orderResponse;
              },
            );
          });
        },
      );
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      },
    );
  });

  after('Cleanup test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
  });

  it(
    'C357550 “Physical” format specific fields are cleared when changing order format from "P/E Mix" to "Electronic Resource" (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C357550'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.addOrderFormat(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE);
      OrderLines.fillCostDetailsForElectronicOrderType('10', '1');
      OrderLines.save();
      OrderLines.verifyFieldWarningMessage();
      OrderLines.setPhysicalQuantity('0');
      OrderLines.save();
      InteractorsTools.checkCalloutMessage(
        `The purchase order line ${testData.order.poNumber}-1 was successfully updated`,
      );
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [{ key: 'Order format', value: 'Electronic Resource' }],
        costDetails: [{ key: 'Physical unit price', value: 'No value set-' }],
        locationDetails: [{ key: 'Quantity physical', value: 'No value set-' }],
      });
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.addReveivingNoteToItemDetailsAndSave(testData.order.poNumber);
      InteractorsTools.checkCalloutMessage(
        `The purchase order line ${testData.order.poNumber}-1 was successfully updated`,
      );
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [{ key: 'Order format', value: 'Electronic Resource' }],
        costDetails: [{ key: 'Physical unit price', value: 'No value set-' }],
        locationDetails: [{ key: 'Quantity physical', value: 'No value set-' }],
      });
    },
  );
});
