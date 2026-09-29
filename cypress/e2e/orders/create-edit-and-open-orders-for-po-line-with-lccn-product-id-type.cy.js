import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const PRODUCT_ID_TYPES = { ISBN: 'ISBN', LCCN: 'LCCN' };
  const quantity = '1';
  let testData;

  before('Create test data', () => {
    const organization = NewOrganization.getDefaultOrganization();

    testData = {
      organization,
      firstOrder: NewOrder.getDefaultOrder({ vendorId: organization.id }),
      secondOrder: NewOrder.getDefaultOrder({ vendorId: organization.id }),
      orderLineTitle: `AT_C440062_OrderLineInstance_${getRandomPostfix()}`,
      instanceTitle: `AT_C440062_FolioInstance_${getRandomPostfix()}`,
      lccnProductId: `${randomNDigitNumber(6)}`,
      isbn: `9781${randomNDigitNumber(9)}`,
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition #1: Organization - vendor
    Organizations.createOrganizationViaApi(testData.organization);
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.location, testData.secondLocation] = locations;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // Instance to be connected to PO line of Order #2 (Product ID type different from "LCCN")
    cy.getProductIdTypes({ query: `name=="${PRODUCT_ID_TYPES.ISBN}"` }).then((productIdType) => {
      testData.isbnProductIdTypeId = productIdType.id;

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
            identifiers: [{ value: testData.isbn, identifierTypeId: testData.isbnProductIdTypeId }],
          },
        }).then(({ instanceId }) => {
          testData.instanceId = instanceId;
        });
      });
    });

    // Precondition #2: Order #1 in "Pending" status without PO line
    Orders.createOrderViaApi(testData.firstOrder).then((order) => {
      testData.firstOrder = order;
    });

    // Precondition #3: Order #2 in "Pending" status with one PO line connected to the instance
    cy.then(() => {
      Orders.createOrderViaApi(testData.secondOrder).then((order) => {
        testData.secondOrder = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            instanceId: testData.instanceId,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            productIds: [{ productId: testData.isbn, productIdType: testData.isbnProductIdTypeId }],
          }),
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
          locations: [
            {
              locationId: testData.location.id,
              quantity: Number(quantity),
              quantityPhysical: Number(quantity),
            },
          ],
        });
      });
    });

    // Precondition #4: User with required capabilities is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition #5: User is in "Orders" app, "Orders" toggle is selected
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C440062 Create, edit and open Orders for the PO line with "LCCN" as a Product ID type (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440062'] },
    () => {
      // Step 1: Navigate to Order #1 => click "Actions" in "PO lines" accordion => "Add PO line"
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.selectAddPOLine();

      // Step 2: Fill "Title" (without "Title look-up") => click "Add product ID and product ID type"
      OrderLineEditForm.fillItemDetails({ title: testData.orderLineTitle });
      OrderLineEditForm.clickAddProductIdButton();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'productId', conditions: { value: '' } },
        { label: 'qualifier', conditions: { value: '' } },
        { label: 'productIdType', conditions: { value: '' } },
      ]);

      // Step 3: Enter any value in "Product ID*" field => select "LCCN" in "Product ID type*" dropdown
      OrderLineEditForm.fillProductId({
        productId: testData.lccnProductId,
        productIdType: PRODUCT_ID_TYPES.LCCN,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'productId', conditions: { value: testData.lccnProductId } },
      ]);

      // Step 4: Specify "Receiving workflow", "Quantity physical", "Create inventory",
      // fill all mandatory fields => click "Save & close"
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          materialType: testData.materialType.name,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: quantity,
        },
      });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: quantity }]);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineEditForm.verifyOrderLineEditFormClosed();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.lccnProductId,
        productIdType: PRODUCT_ID_TYPES.LCCN,
      });

      // Step 5: Click back arrow => "Actions" => "Open" => "Submit"
      OrderLines.backToEditingOrder();
      OrderDetails.openOrder({ orderNumber: testData.firstOrder.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 6: Click PO line record in "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.lccnProductId,
        productIdType: PRODUCT_ID_TYPES.LCCN,
      });

      // Step 7: Click on the Title name link in "Item details" accordion
      OrderLines.openInstance();
      InventoryInstance.waitInstanceRecordViewOpened();
      InventoryInstance.checkInstanceTitle(testData.orderLineTitle);
      InventoryInstance.verifyResourceIdentifier(PRODUCT_ID_TYPES.LCCN, testData.lccnProductId, 0);

      // Step 8: Expand accordion with holding name from opened order
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);

      // Step 9: Navigate to Order #2 => click PO line record => "Actions" => "Edit"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetAllFilters();
      Orders.waitLoading();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.isbn,
        productIdType: PRODUCT_ID_TYPES.ISBN,
      });
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 10-11: Expand "Product ID type*" dropdown => select "LCCN" option
      OrderLineEditForm.fillProductId({
        productIdType: PRODUCT_ID_TYPES.LCCN,
        checkProductIdType: false,
      });
      OrderLines.verifyRemoveInstanceConnectionModal(testData.instanceTitle);

      // Step 12: Click "Confirm" button in "Remove instance connection" confirmation popup
      OrderLines.removeInstanceConnectionModal();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'productIdType', conditions: { checkedOptionText: PRODUCT_ID_TYPES.LCCN } },
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 13: Select any value in "Locations" accordion
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.secondLocation.name);
      OrderLineEditForm.checkLocationSelected({ location: testData.secondLocation.name });

      // Step 14: Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineEditForm.verifyOrderLineEditFormClosed();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.isbn,
        productIdType: PRODUCT_ID_TYPES.LCCN,
      });
    },
  );
});
