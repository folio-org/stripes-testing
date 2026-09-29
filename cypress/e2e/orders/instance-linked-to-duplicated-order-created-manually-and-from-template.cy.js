import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  OrderDetails,
  OrderEditForm,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OpenConfirmationModal from '../../support/fragments/orders/modals/openConfirmationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  let testData;

  const getPoLineData = (title) => ({
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

  // Stores the order created in UI (manually, from template or by duplication) under the given key
  const storeNewOrder = (orderKey) => {
    cy.getAdminToken(false).then(() => {
      Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
        const knownOrderIds = Object.values(testData.orders).map(({ id }) => id);

        testData.orders[orderKey] = orders.find(({ id }) => !knownOrderIds.includes(id));
      });
    });
    cy.getUserToken(testData.user.username, testData.user.password);
  };

  const savePoLine = (title) => {
    OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
    OrderLineDetails.waitLoading();
    OrderLineDetails.checkItemDetailsSection([{ key: 'Title', value: title }]);
  };

  const openOrder = () => {
    OrderLineDetails.backToOrderDetails();
    OrderDetails.waitLoading();
    OrderDetails.openOrder({ confirm: false });
    OpenConfirmationModal.confirm();
    OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
  };

  const duplicateOrder = (orderKey) => {
    Orders.duplicateOrder({ verifyModal: true });
    InteractorsTools.checkCalloutMessage(OrderStates.orderDuplicatedSuccessfully);
    OrderDetails.waitLoading();
    storeNewOrder(orderKey);
  };

  const verifyDuplicatedOrder = (originalOrder, duplicatedOrder, poLinesCount) => {
    expect(duplicatedOrder.poNumber).to.not.equal(originalOrder.poNumber);
    OrderDetails.verifyOrderTitle(`Purchase order - ${duplicatedOrder.poNumber}`);
    OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
    OrderDetails.checkOrderDetails({
      orderInformation: [
        { key: ORDER_VIEW_FIELD_LABELS.VENDOR, value: testData.organization.name },
        { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONE_TIME },
      ],
    });
    OrderDetails.verifyPOLCount(poLinesCount);
    for (let lineNumber = 1; lineNumber <= poLinesCount; lineNumber++) {
      OrderDetails.checkOrderLineInTableByIdentifier(`${duplicatedOrder.poNumber}-${lineNumber}`);
    }
  };

  // Duplicated PO line must be linked to the original instance and contain the original PO line data
  // PO line is opened by its unique title, since PO line numbers order is not guaranteed after duplication
  const verifyDuplicatedPoLine = (duplicatedOrder, { title, createInventory, materialType }) => {
    OrderDetails.openPolDetails(title);
    OrderLineDetails.waitLoading();
    OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${duplicatedOrder.poNumber}-`);
    OrderLineDetails.checkOrderLineDetails({
      itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: title }],
      poLineInformation: [
        {
          key: POLINE_DETAILS_FIELDS.ACQUISITION_METHOD,
          value: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        },
        { key: POLINE_DETAILS_FIELDS.ORDER_FORMAT, value: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE },
        {
          key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
          value: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        },
      ],
      costDetails: [
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '10' },
        { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
      ],
      locationDetails: {
        locations: [
          [
            {
              // Holding is created on opening the original order unless only Instance is created
              key:
                createInventory === POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE
                  ? POLINE_DETAILS_FIELDS.LOCATION_NAME
                  : POLINE_DETAILS_FIELDS.HOLDING_NAME,
              value: testData.location.name,
            },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      },
      physicalResourceDetails: [
        { key: POLINE_DETAILS_FIELDS.CREATE_INVENTORY, value: createInventory },
        ...(materialType ? [{ key: 'Material type', value: materialType }] : []),
      ],
      linkedInstances: [{ title }],
    });
    OrderLineDetails.checkTitleIsLink(title);
  };

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C1003534_Vendor_${randomPostfix}`,
      },
      orderTemplate: {},
      orders: {},
      poLineTitles: {
        manualOrder: `AT_C1003534_ManualOrder_POLine_InstanceHoldingsItem_${randomPostfix}`,
        templateOrderFirst: `AT_C1003534_TemplateOrder_POLine_InstanceHoldings_${randomPostfix}`,
        templateOrderSecond: `AT_C1003534_TemplateOrder_POLine_Instance_${randomPostfix}`,
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
        // Precondition 2: Order template with Vendor, Order type, Currency (USD) and Location
        testData.orderTemplate = OrderTemplates.getDefaultOrderTemplate({
          additionalProperties: {
            templateName: `AT_C1003534_OrderTemplate_${randomPostfix}`,
            vendor: testData.organization.id,
            orderType: ORDER_TYPES.ONE_TIME_API,
            locations: [{ locationId: testData.location.id }],
          },
        });

        OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
      });

    // Precondition 3: Authorized user with required capabilities
    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        // Precondition 4: User is in "Orders" app, "Orders" toggle is selected
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
      Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
        orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
      });
      Object.values(testData.poLineTitles).forEach((title) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(title);
      });
      OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C1003534 Instance is linked to the duplicated order created both manually and from a template (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1003534', 'nonParallel'] },
    () => {
      // Step 1: Click "Actions" button on the "Orders" pane and select "New" option
      Orders.clickCreateNewOrder();

      // Step 2: Fill in all mandatory fields and click "Save & close"
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organization.name,
        orderType: ORDER_TYPES.ONE_TIME,
      });
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      storeNewOrder('manual');

      // Step 3: Click "Actions" button in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();

      // Step 4: Fill in "Title", select "Instance, holdings, item" in "Create inventory",
      // fill in all other mandatory fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields(getPoLineData(testData.poLineTitles.manualOrder));
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM);
      OrderLines.addMaterialType(MATERIAL_TYPE_NAMES.BOOK);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
      savePoLine(testData.poLineTitles.manualOrder);

      // Step 5: Click back arrow, click "Actions", select "Open" and click "Submit" in the modal
      openOrder();

      // Step 6: Click "Actions", select "Duplicate" and click "Duplicate" in the modal
      duplicateOrder('duplicatedManual');

      cy.then(() => {
        const { manual, duplicatedManual } = testData.orders;

        verifyDuplicatedOrder(manual, duplicatedManual, 1);

        // Step 7: Click on the PO line record in the "PO lines" accordion
        verifyDuplicatedPoLine(duplicatedManual, {
          title: testData.poLineTitles.manualOrder,
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
        });
      });

      // Step 8: Click "Actions" on the "Orders" pane, select "New",
      // select the order template from Preconditions and click "Save & close"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.clickCreateNewOrder();
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      storeNewOrder('template');

      // Step 9: Click "Actions" button in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();

      // Step 10: Fill in "Title", select "Instance, holdings" in "Create inventory",
      // fill in all other mandatory fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields({
        ...getPoLineData(testData.poLineTitles.templateOrderFirst),
        locationDetails: [{ quantityPhysical: '1' }],
      });
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING);
      savePoLine(testData.poLineTitles.templateOrderFirst);

      // Step 11: Click back arrow, click "Actions" in "PO lines" accordion, select "Add PO line"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.selectAddPOLine();

      // Step 12: Fill in "Title", select "Instance" in "Create inventory",
      // fill in all other mandatory fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields({
        ...getPoLineData(testData.poLineTitles.templateOrderSecond),
        locationDetails: [{ quantityPhysical: '1' }],
      });
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE);
      savePoLine(testData.poLineTitles.templateOrderSecond);

      // Step 13: Click back arrow, click "Actions", select "Open" and click "Submit" in the modal
      openOrder();

      // Step 14: Click "Actions", select "Duplicate" and click "Duplicate" in the modal
      duplicateOrder('duplicatedTemplate');

      cy.then(() => {
        const { template, duplicatedTemplate } = testData.orders;

        verifyDuplicatedOrder(template, duplicatedTemplate, 2);
        // Step 15: Click on the PO line #1 in the "PO lines" accordion
        verifyDuplicatedPoLine(duplicatedTemplate, {
          title: testData.poLineTitles.templateOrderFirst,
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING,
        });

        // Step 16: Click back arrow and click on the PO line #2 in the "PO lines" accordion
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        verifyDuplicatedPoLine(duplicatedTemplate, {
          title: testData.poLineTitles.templateOrderSecond,
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE,
        });
      });
    },
  );
});
