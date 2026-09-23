import {
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const organization = {
    ...NewOrganization.getDefaultOrganization(),
    name: `AT_C402324_Vendor_${randomPostfix}`,
  };
  const testData = {
    organization,
    acquisitionUnit: AcquisitionUnits.getDefaultAcquisitionUnit({
      name: `AT_C402324_AcqUnit_${randomPostfix}`,
      protectUpdate: false,
      protectCreate: false,
      protectDelete: false,
    }),
    servicePoint: ServicePoints.getDefaultServicePoint(),
    user: {},
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      // Precondition #1: Active "Vendor" organization
      Organizations.createOrganizationViaApi(testData.organization);

      // Precondition #2: Acquisition unit included in order template
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit).then(() => {
        cy.getAdminUserId().then((adminUserId) => {
          AcquisitionUnits.assignUserViaApi(adminUserId, testData.acquisitionUnit.id).then(
            (membershipId) => {
              testData.adminMembershipId = membershipId;
            },
          );
        });
      });

      testData.orderTemplate = OrderTemplates.getDefaultOrderTemplate({
        additionalProperties: {
          orderType: 'One-time',
          vendor: testData.organization.id,
          acqUnitIds: [testData.acquisitionUnit.id],
        },
      });
      OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);

      ServicePoints.createViaApi(testData.servicePoint)
        .then(() => {
          testData.locations = [
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
          ];
          testData.locations.forEach((location) => Locations.createViaApi(location));
        })
        .then(() => {
          testData.orderLine = {
            ...BasicOrderLine.getDefaultOrderLine(),
            titleOrPackage: `AT_C402324_PolTitle_${randomPostfix}`,
            cost: {
              currency: 'USD',
              discountType: 'percentage',
              quantityElectronic: 2,
              listUnitPriceElectronic: 10,
            },
            orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
            eresource: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
              accessProvider: testData.organization.id,
            },
            locations: [
              {
                locationId: testData.locations[0].id,
                quantityPhysical: 0,
                quantityElectronic: 1,
              },
              {
                locationId: testData.locations[1].id,
                quantityPhysical: 0,
                quantityElectronic: 1,
              },
            ],
          };

          // Order is created using order template and acquisition unit from the template
          Orders.createOrderWithOrderLineViaApi(
            {
              ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              template: testData.orderTemplate.id,
              acqUnitIds: [testData.acquisitionUnit.id],
            },
            testData.orderLine,
          ).then((order) => {
            testData.order = order;

            // Order should be in "Open" status
            Orders.updateOrderViaApi({
              ...testData.order,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
        });
    });

    // Precondition #3: Authorized user with required permissions
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.getAdminToken();
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acquisitionUnit.id).then(
        (membershipId) => {
          testData.userMembershipId = membershipId;
        },
      );

      // Precondition #4: A user is on "Orders" pane with search results for Order
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
    AcquisitionUnits.unAssignUserViaApi(testData.userMembershipId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
    testData.locations.forEach((location) => {
      InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(location.id);
      Locations.deleteViaApi(location);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C402324 Edit location details on "Electronic Resource" format PO line with Independent workflow  (using order template) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C402324'] },
    () => {
      // Step 1: Open Order from "Preconditions #2" details pane
      Orders.resetFiltersIfActive();
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.locations[0].name },
            { key: 'Quantity electronic', value: 1 },
          ],
          [
            { key: 'Holding', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });

      // Step 3: Click on "Title" link in "Item details" accordion
      const InventoryInstance = OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name, count: 0 });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, count: 0 });

      // Step 4: Go back to PO line details pane => click "Actions" => select "Edit"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 5: Click "Trash" icon next to the first holding name in "Location" accordion
      OrderLineEditForm.removeLocationByIndex(0);

      // Step 6: Enter "2" in "Quantity electronic" field for remaining location => "Save & close"
      OrderLineEditForm.fillLocationDetails([{ quantityElectronic: '2' }]);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 2 },
          ],
        ],
      });

      // Step 7: Click "Back to PO" arrow button on "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 8: Click "Actions" => select "Unopen" => click "Delete Holdings" in the modal
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems: true,
      });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 9: Click PO line record => click on "Title" link in "Item details" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, absent: true });
    },
  );
});
