import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import { NewOrder, BasicOrderLine, Orders } from '../../support/fragments/orders';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    servicePoint: ServicePoints.getDefaultServicePoint(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);

      ServicePoints.createViaApi(testData.servicePoint)
        .then(() => {
          testData.location = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;

          Locations.createViaApi(testData.location);
        })
        .then(() => {
          cy.getMaterialTypes({ limit: 1 }).then(({ id: materialTypeId }) => {
            testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
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
                accessProvider: testData.organization.id,
              },
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: materialTypeId,
              },
              locations: [
                {
                  locationId: testData.location.id,
                  quantityPhysical: 1,
                  quantityElectronic: 1,
                },
              ],
            };

            Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
              (order) => {
                testData.order = order;
              },
            );
          });
        });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C354281 “Electronic” format specific fields are cleared when changing order format from "P/E Mix" to "Physical Resource" (thunderjet) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.thunderjet] },
    () => {
      // Click on the Order record from preconditions
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click on the PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [{ key: 'Order format', value: 'P/E Mix' }],
      });

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();

      // Choose "Physical resource" from "Order format" dropdown, Click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { orderFormat: 'Physical resource' },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: false });
      OrderLineEditForm.checkValidatorError({
        locationDetails: {
          label: 'Quantity electronic',
          error:
            'Locations electronic quantity should be empty or match with PO line electronic quantity',
        },
      });

      // Delete prefilled value from "Quantity electronic" field in "Location" accordion and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        locationDetails: [{ quantityElectronic: '0' }],
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [{ key: 'Order format', value: 'Physical Resource' }],
      });

      // #7 Click "Back to PO" arrow on the top of "PO Line details" pane
      // "Purchase order" pane is displayed
      OrderLineDetails.backToOrderDetails();

      // Click "Actions" button, Select "Open" option, Slick "Submit" button
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on the PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [{ key: 'Order format', value: 'Physical Resource' }],
      });

      // Click "Actions" button, Select "Edit" option
      OrderLineDetails.openOrderLineEditForm();

      // Add receiving note in "Item details" accordion and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: 'some note' },
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [{ key: 'Order format', value: 'Physical Resource' }],
        costDetails: [
          { key: 'Quantity physical', value: '1' },
          { key: 'Quantity electronic', value: '-' },
        ],
        locationDetails: [
          [
            { key: 'Holding', value: testData.location.name },
            { key: 'Quantity physical', value: 1 },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });
    },
  );
});
