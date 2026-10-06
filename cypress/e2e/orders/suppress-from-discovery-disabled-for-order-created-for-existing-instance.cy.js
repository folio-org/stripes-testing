import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  const poLineData = {
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
      receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
    },
  };
  let testData;

  before('Create test data', () => {
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C820862_Vendor_${getRandomPostfix()}`,
      },
      order: {},
      instances: {
        notSuppressed: { title: `AT_C820862_Instance_NotSuppressed_${getRandomPostfix()}` },
        suppressed: { title: `AT_C820862_Instance_Suppressed_${getRandomPostfix()}` },
      },
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: Purchase order lines limit is set to more than 2
    OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);

    // Precondition 2: Instance #1 NOT suppressed from discovery, Instance #2 suppressed from discovery
    cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: instanceTypes[0].id,
          title: testData.instances.notSuppressed.title,
          discoverySuppress: false,
        },
      });
      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: instanceTypes[0].id,
          title: testData.instances.suppressed.title,
          discoverySuppress: true,
        },
      });
    });

    // Precondition 3: Order in "Pending" status without PO lines
    Organizations.createOrganizationViaApi(testData.organization)
      .then(() => {
        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        );
      })
      .then((order) => {
        testData.order = order;
      });

    // Precondition 4: Authorized user with required capabilities
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 5: User is in "Orders" app with details pane open for the order
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
      Object.values(testData.instances).forEach(({ title }) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(title);
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C820862 Suppress from discovery flag is disabled when an order is created for an existing instance (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C820862', 'nonParallel'] },
    () => {
      // Step 1: Click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: false } },
      ]);

      // Step 2: Click "Title look-up", search for Instance #1 and click on it
      OrderLineEditForm.fillItemDetailsTitle({
        instanceTitle: testData.instances.notSuppressed.title,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instances.notSuppressed.title } },
        {
          label: 'suppressInstanceFromDiscovery',
          conditions: { checked: false, disabled: true },
        },
      ]);

      // Step 3: Clear "Title" field and click "Confirm" in "Remove instance connection" modal
      OrderLineEditForm.fillItemDetails({ title: '' });
      OrderLines.removeInstanceConnectionModal();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: '' } },
        {
          label: 'suppressInstanceFromDiscovery',
          conditions: { checked: false, disabled: false },
        },
      ]);

      // Step 4: Click "Title look-up", search for Instance #1 and click on it
      OrderLineEditForm.fillItemDetailsTitle({
        instanceTitle: testData.instances.notSuppressed.title,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instances.notSuppressed.title } },
        {
          label: 'suppressInstanceFromDiscovery',
          conditions: { checked: false, disabled: true },
        },
      ]);

      // Step 5: Fill all other mandatory fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields(poLineData);
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
          value: { checked: false, disabled: true },
          checkbox: true,
        },
      ]);

      // Step 6: Click back arrow, click "Actions" in "PO lines" accordion, select "Add PO line"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'suppressInstanceFromDiscovery', conditions: { checked: false, disabled: false } },
      ]);

      // Step 7: Click "Title look-up", search for Instance #2 and click on it
      OrderLineEditForm.fillItemDetailsTitle({
        instanceTitle: testData.instances.suppressed.title,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instances.suppressed.title } },
        {
          label: 'suppressInstanceFromDiscovery',
          conditions: { checked: true, disabled: true },
        },
      ]);

      // Step 8: Clear "Title" field and click "Confirm" in "Remove instance connection" modal
      OrderLineEditForm.fillItemDetails({ title: '' });
      OrderLines.removeInstanceConnectionModal();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: '' } },
        { label: 'suppressInstanceFromDiscovery', conditions: { disabled: false } },
      ]);

      // Step 9: Click "Title look-up", search for Instance #2 and click on it
      OrderLineEditForm.fillItemDetailsTitle({
        instanceTitle: testData.instances.suppressed.title,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instances.suppressed.title } },
        {
          label: 'suppressInstanceFromDiscovery',
          conditions: { checked: true, disabled: true },
        },
      ]);

      // Step 10: Fill all other mandatory fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields(poLineData);
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
          value: { checked: true, disabled: true },
          checkbox: true,
        },
      ]);

      // Step 11: Click back arrow, click "Actions" => "Open" and click "Submit" in the modal
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openOrder({ confirm: false });
      OpenConfirmationModal.confirm();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 12: Click on the PO line #1 and click on the Instance #1 name link in "Item details"
      OrderDetails.openPolDetails(testData.instances.notSuppressed.title);
      OrderLineDetails.openInventoryItem();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning(false);

      // Step 13: Navigate back to "Purchase order" details pane, click on the PO line #2
      // and click on the Instance #2 name link in "Item details"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.waitLoading();
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.instances.suppressed.title);
      OrderLineDetails.openInventoryItem();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
    },
  );
});
