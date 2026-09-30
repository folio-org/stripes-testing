import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  MATERIAL_TYPE_NAMES,
  NO_VALUE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OpenConfirmationModal from '../../support/fragments/orders/modals/openConfirmationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  let testData;

  const fillAndSavePoLine = ({ title, receivingNote }) => {
    OrderLineEditForm.fillOrderLineFields({
      itemDetails: receivingNote ? { title, receivingNote } : { title },
    });
    OrderLineEditForm.clickMustAcknowledgeReceivingNoteCheckbox();
    OrderLineEditForm.fillOrderLineFields({
      poLineDetails: {
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      },
      costDetails: {
        physicalUnitPrice: '10',
        quantityPhysical: '1',
      },
    });
    OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM);
    OrderLines.addMaterialType(MATERIAL_TYPE_NAMES.BOOK);
    OrderLineEditForm.clickAddLocationButton();
    OrderLineEditForm.expandLocationDropdown(0);
    OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
    OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
    OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
    OrderLineDetails.waitLoading();
  };

  const searchInstanceInInventory = (title, { isFound, resetFilters = true }) => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

    if (resetFilters) {
      InventorySearchAndFilter.resetAll();
    }

    InventoryInstances.waitContentLoading();
    InventoryInstances.searchByTitle(title, isFound);

    if (isFound) {
      InventoryInstances.checkSearchResultCount('1 record found');
    } else {
      InventorySearchAndFilter.verifyNoRecordsFound();
    }
  };

  // "Orders" app restores the last opened PO line details pane, so no need to search the order again
  const returnToOrderDetails = () => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
    OrderLineDetails.waitLoading();
    OrderLineDetails.backToOrderDetails();
    OrderDetails.waitLoading();
  };

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C1292044_Vendor_${randomPostfix}`,
      },
      firstOrder: {},
      secondOrder: {},
      firstPoLineTitle: `AT_C1292044_POLine1_${randomPostfix}`,
      secondPoLineTitle: `AT_C1292044_POLine2_${randomPostfix}`,
      firstReceivingNote: `AT_C1292044_ReceivingNote1_${randomPostfix}`,
      secondReceivingNote: `AT_C1292044_ReceivingNote2_${randomPostfix}`,
      user: {},
    };

    cy.getAdminToken();
    Locations.getViaApiAnyDefault(1)
      .then(([location]) => {
        testData.location = location;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => {
        // Precondition 1: Order #1 in "Pending" status without PO line
        Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: testData.organization.id }));
      })
      .then((order) => {
        testData.firstOrder = order;

        // Precondition 2: Order #2 in "Pending" status without PO line
        Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: testData.organization.id }));
      })
      .then((order) => {
        testData.secondOrder = order;
      });

    // Precondition 3: User with required capabilities
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" pane with details pane opened for Order #1
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.firstPoLineTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.secondPoLineTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1292044 "Must acknowledge receiving note" checkbox does not create an Instance for the Pending order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1292044'] },
    () => {
      // Step 1: Click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'mustAcknowledgeReceivingNote', conditions: { checked: false } },
      ]);

      // Step 2: Fill in "Title" (without "Title look-up"), check "Must acknowledge receiving note",
      // fill in all other required fields, click "Save & close"
      fillAndSavePoLine({ title: testData.firstPoLineTitle });
      OrderLineDetails.checkItemDetailsSection([
        { key: POLINE_DETAILS_FIELDS.RECEIVING_NOTE, value: NO_VALUE },
      ]);

      // Step 3: Navigate to "Inventory" app, search for the Title from POL
      searchInstanceInInventory(testData.firstPoLineTitle, { isFound: false, resetFilters: false });

      // Step 4: Navigate back to Order #1, click on the PO line, click "Actions" => "Edit"
      returnToOrderDetails();
      OrderDetails.openPolDetails(testData.firstPoLineTitle);
      OrderLineDetails.waitLoading();
      OrderLineDetails.openOrderLineEditForm();

      // Step 5: Fill in the "Receiving note" field, click "Save & close"
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: testData.firstReceivingNote },
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        { key: POLINE_DETAILS_FIELDS.RECEIVING_NOTE, value: testData.firstReceivingNote },
      ]);

      // Step 6: Navigate to "Inventory" app, search for the Title from POL
      searchInstanceInInventory(testData.firstPoLineTitle, { isFound: false });

      // Step 7: Navigate back to Order #1, click "Actions" => "Open", click "Submit"
      returnToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.firstOrder.poNumber, confirm: false });
      OpenConfirmationModal.confirm();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 8: Navigate to "Inventory" app, search for the Title from POL
      searchInstanceInInventory(testData.firstPoLineTitle, { isFound: true });

      // Step 9: Navigate to "Orders" app, open Order #2,
      // click "Actions" in "PO lines" accordion and select "Add PO line"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      OrderDetails.waitLoading();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'mustAcknowledgeReceivingNote', conditions: { checked: false } },
      ]);

      // Step 10: Fill in "Title" (without "Title look-up") and "Receiving note",
      // check "Must acknowledge receiving note", fill in all other required fields, click "Save & close"
      fillAndSavePoLine({
        title: testData.secondPoLineTitle,
        receivingNote: testData.secondReceivingNote,
      });
      OrderLineDetails.checkItemDetailsSection([
        { key: POLINE_DETAILS_FIELDS.RECEIVING_NOTE, value: testData.secondReceivingNote },
      ]);

      // Step 11: Navigate to "Inventory" app, search for the Title from POL
      searchInstanceInInventory(testData.secondPoLineTitle, { isFound: false });

      // Step 12: Navigate back to Order #2, click "Actions" => "Open", click "Submit"
      returnToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.secondOrder.poNumber, confirm: false });
      OpenConfirmationModal.confirm();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 13: Navigate to "Inventory" app, search for the Title from POL
      searchInstanceInInventory(testData.secondPoLineTitle, { isFound: true });
    },
  );
});
