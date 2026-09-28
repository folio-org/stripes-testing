import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OpenConfirmationModal from '../../support/fragments/orders/modals/openConfirmationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  let testData;

  const fillPoLineFields = (title) => {
    OrderLineEditForm.fillOrderLineFields({
      itemDetails: { title },
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
  };

  const openOrderDetails = () => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
    Orders.waitLoading();
    Orders.resetFiltersIfActive();
    Orders.selectOrderByPONumber(testData.order.poNumber);
    OrderDetails.waitLoading();
  };

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C820861_Vendor_${randomPostfix}`,
      },
      order: {},
      poLineTitles: {
        notSuppressed: `AT_C820861_POLine_NotSuppressed_${randomPostfix}`,
        suppressed: `AT_C820861_POLine_Suppressed_${randomPostfix}`,
      },
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: Purchase order lines limit is set to more than 2
    OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);
    Locations.getViaApiAnyDefault(1)
      .then(([location]) => {
        testData.location = location;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => {
        // Precondition 2: Order in "Pending" status without PO lines
        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        );
      })
      .then((order) => {
        testData.order = order;
      });

    // Precondition 3: Authorized user with required capabilities
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is in "Orders" app with details pane open for the order
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
      Orders.deleteOrderViaApi(testData.order.id, false);
      Object.values(testData.poLineTitles).forEach((title) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(title);
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C820861 Suppress from discovery flag correctly applied when instance is created from the order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C820861', 'nonParallel'] },
    () => {
      // Step 1: Click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: false } },
      ]);

      // Step 2: Click on the tool tip "i" icon next to the Suppress checkbox
      OrderLineEditForm.verifySuppressInstanceFromDiscoveryInfoPopover();

      // Step 3: Check Suppress checkbox, fill in "Title" and all other mandatory fields,
      // click "Save & close"
      OrderLineEditForm.clickSuppressInstanceFromDiscoveryCheckbox();
      fillPoLineFields(testData.poLineTitles.notSuppressed);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
          value: { checked: true, disabled: true },
          checkbox: true,
        },
      ]);

      // Step 4: Click "Actions" => "Edit", uncheck Suppress checkbox, click "Save & close"
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.clickSuppressInstanceFromDiscoveryCheckbox();
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
          value: { checked: false, disabled: true },
          checkbox: true,
        },
      ]);

      // Step 5: Click "Version history" icon on the "PO Line details" pane
      OrderLineDetails.openVersionHistory();
      OrderLines.verifyVersionsCount(2);
      OrderLineDetails.checkFieldIsHighlighted(
        POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
      );
      OrderLines.assertVersionHistoryCard({
        index: 0,
        changedFields: ['Changed', POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY],
      });

      // Step 6: Close "Version history", click back arrow,
      // click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderLines.closeVersionHistory();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.selectAddPOLine();

      // Step 7: Check Suppress checkbox, fill in "Title" and all other mandatory fields,
      // click "Save & close"
      OrderLineEditForm.clickSuppressInstanceFromDiscoveryCheckbox();
      fillPoLineFields(testData.poLineTitles.suppressed);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
          value: { checked: true, disabled: true },
          checkbox: true,
        },
      ]);

      // Step 8: Click back arrow, click "Actions" => "Open" and click "Submit" in the modal
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openOrder({ confirm: false });
      OpenConfirmationModal.confirm();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 9: Click on the PO line #1, click "Actions" => "Edit"
      OrderDetails.openPolDetails(testData.poLineTitles.notSuppressed);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: false, disabled: true } },
      ]);

      // Step 10: Close "Edit" page and click on the title link in "Item details" accordion
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.openInventoryItem();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning(false);

      // Step 11: Navigate back to "Purchase order" details pane,
      // click on the PO line #2, click "Actions" => "Edit"
      openOrderDetails();
      OrderDetails.openPolDetails(testData.poLineTitles.suppressed);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: true, disabled: true } },
      ]);

      // Step 12: Close "Edit" page and click on the title link in "Item details" accordion
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.openInventoryItem();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

      // Step 13: Navigate back to "Purchase order" details pane, click "Actions" => "Unopen",
      // click "Delete Holdings and items" in the modal
      openOrderDetails();
      OrderDetails.unOpenOrder({ orderNumber: testData.order.poNumber, checkinItems: false });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 14: Click on the PO line #1, click "Actions" => "Edit"
      OrderDetails.openPolDetails(testData.poLineTitles.notSuppressed);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: false, disabled: true } },
      ]);

      // Step 15: Close "Edit" page, click back arrow, click on the PO line #2,
      // click "Actions" => "Edit"
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.poLineTitles.suppressed);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: true, disabled: true } },
      ]);
    },
  );
});
