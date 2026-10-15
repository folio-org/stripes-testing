import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_LINE_RESULTS_LIST_COLUMNS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import Budgets from '../../support/fragments/finance/budgets/budgets';
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
import PossibleDuplicateOrderLineModal from '../../support/fragments/orders/modals/possibleDuplicateOrderLineModal';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import InventoryInteractions from '../../support/fragments/settings/orders/inventoryInteractions';
import OpenOrder from '../../support/fragments/settings/orders/openOrder';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const PRODUCT_ID_TYPE = 'ISBN';
  const VENDOR_REF_NUMBER_TYPE = 'Vendor order reference number';
  const poLinesLimit = 5;
  const initialPoLinesLimit = 1;
  const quantity = '1';
  const instancePublication = {
    publisher: 'AT_C350515_Publisher',
    dateOfPublication: '2020',
    edition: 'AT_C350515_Edition',
  };
  const poLinesTableColumns = {
    POL_NUMBER: ORDER_LINE_RESULTS_LIST_COLUMNS.PO_LINE_NUMBER,
    TITLE: ORDER_LINE_RESULTS_LIST_COLUMNS.TITLE_OR_PACKAGE,
    PRODUCT_ID: ORDER_LINE_RESULTS_LIST_COLUMNS.PRODUCT_ID,
    VENDOR_REF_NUMBER: ORDER_LINE_RESULTS_LIST_COLUMNS.VENDOR_REF_NUMBER,
    FUND_CODE: ORDER_LINE_RESULTS_LIST_COLUMNS.FUND_CODE,
    ESTIMATED_PRICE: 'Estimated price',
  };
  const allPoLinesTableColumns = Object.values(poLinesTableColumns);
  const toggledColumns = [poLinesTableColumns.VENDOR_REF_NUMBER, poLinesTableColumns.FUND_CODE];
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C350515_FolioInstance_${getRandomPostfix()}`,
      isbn: `9781${randomNDigitNumber(9)}`,
      vendorRefNumber: `AT_C350515_RefNumber_${getRandomPostfix()}`,
      order: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition #3: Duplicate check is not disabled
    OpenOrder.setDuplicateCheckValue(false);
    // Precondition #4: Purchase order line limit is set to more than one
    OrderLinesLimit.setPOLLimitViaApi(poLinesLimit);
    // Precondition #5: Inventory interactions default for "Electronic" is "Instance, holdings"
    InventoryInteractions.getInventoryInteractionsDefaultsSettings().then((settings) => {
      if (settings?.length) {
        testData.initialInventoryInteractionsDefaults = settings[0].value;
        InventoryInteractions.setInventoryInteractionsDefaultsSetting({
          ...settings[0],
          value: JSON.stringify({
            ...JSON.parse(settings[0].value),
            eresource: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          }),
        });
      }
    });

    const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });
    testData.fund = financeData.fund;
    testData.budget = financeData.budget;

    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // Instance with a valid ISBN and a holding
    cy.getProductIdTypes({ query: `name=="${PRODUCT_ID_TYPE}"` }).then((productIdType) => {
      testData.productIdTypeId = productIdType.id;
    });
    cy.then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
              identifiers: [{ value: testData.isbn, identifierTypeId: testData.productIdTypeId }],
              publication: [
                {
                  publisher: instancePublication.publisher,
                  dateOfPublication: instancePublication.dateOfPublication,
                },
              ],
              editions: [instancePublication.edition],
            },
            holdings: [
              {
                holdingsTypeId: holdingTypes[0].id,
                permanentLocationId: testData.location.id,
              },
            ],
          }).then((instanceData) => {
            testData.instanceId = instanceData.instanceId;
            testData.holdingId = instanceData.holdings[0].id;
          });
        });
      });
    });

    // Precondition #2: Ongoing order in "Pending" status with POL#1 linked to the instance
    cy.then(() => {
      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: {
            isSubscription: true,
            manualRenewal: true,
            interval: 365,
            renewalDate: '2021-01-01T00:00:00.000+00:00',
          },
        }),
        reEncumber: false,
        approved: true,
      }).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            instanceId: testData.instanceId,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            productIds: [{ productId: testData.isbn, productIdType: testData.productIdTypeId }],
          }),
          orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPriceElectronic: 10,
            quantityElectronic: Number(quantity),
          },
          eresource: {
            activated: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            trial: false,
            accessProvider: testData.organization.id,
          },
          locations: [
            {
              holdingId: testData.holdingId,
              quantity: Number(quantity),
              quantityElectronic: Number(quantity),
            },
          ],
        });
      });
    });

    // Precondition #1: User with required capabilities is logged in
    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(initialPoLinesLimit);
    if (testData.initialInventoryInteractionsDefaults) {
      InventoryInteractions.getInventoryInteractionsDefaultsSettings().then((settings) => {
        InventoryInteractions.setInventoryInteractionsDefaultsSetting({
          ...settings[0],
          value: testData.initialInventoryInteractionsDefaults,
        });
      });
    }
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350515 PO line duplicate validation and column display settings (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C350515', 'nonParallel'] },
    () => {
      const firstPoLineNumber = `${testData.order.poNumber}-1`;
      const secondPoLineNumber = `${testData.order.poNumber}-2`;
      const secondPoLineTableColumns = [
        { columnName: poLinesTableColumns.POL_NUMBER },
        { columnName: poLinesTableColumns.TITLE, value: testData.instanceTitle },
        { columnName: poLinesTableColumns.PRODUCT_ID, value: testData.isbn },
        { columnName: poLinesTableColumns.VENDOR_REF_NUMBER, value: testData.vendorRefNumber },
        { columnName: poLinesTableColumns.FUND_CODE, value: testData.fund.code },
        { columnName: poLinesTableColumns.ESTIMATED_PRICE, value: '0.00' },
      ];

      // Step 1: Click "Actions" => "Add PO line" => select the same title via "Title look-up"
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: testData.instanceTitle });
      OrderLines.checkConnectedInstance();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instanceTitle } },
        { label: 'publicationDate', conditions: { value: instancePublication.dateOfPublication } },
        { label: 'publisher', conditions: { value: instancePublication.publisher } },
        // Edition field currently not prepopulated, we have a story for that UIPFI-187
        // { label: 'edition', conditions: { value: instancePublication.edition } },
        { label: 'productId', conditions: { value: testData.isbn } },
        { label: 'productIdType', conditions: { checkedOptionText: PRODUCT_ID_TYPE } },
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 2: Fill in all the remaining required fields with valid data
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
          orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
        },
        vendorDetails: {
          referenceNumbers: [
            { refNumber: testData.vendorRefNumber, refNumberType: VENDOR_REF_NUMBER_TYPE },
          ],
        },
        costDetails: {
          electronicUnitPrice: '0',
          quantityElectronic: quantity,
        },
      });
      OrderLineEditForm.addFundDistribution({ fund: testData.fund.code, index: 0, amount: '100' });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandHoldingsDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityElectronic: quantity }]);

      // Step 3: Choose "Instance" option from "Create inventory" dropdown in "E-resources details" accordion
      OrderLineEditForm.fillPoLineDetails({
        orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
        createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE,
      });
      OrderLineEditForm.checkEResourcesDetailsSection([
        {
          label: 'createInventory',
          conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE },
        },
      ]);
      OrderLineEditForm.checkLocationSelected({ location: '' });

      // Step 4: Click "Location look-up" link => choose existing location
      OrderLineEditForm.clickLocationLookUpButton();
      SelectLocationModal.selectLocation(testData.location.name);
      OrderLineEditForm.checkLocationSelected({ location: testData.location.name });

      // Step 5: Check if "Quantity electronic" field is specified with "1"
      OrderLineEditForm.checkLocationsSection([
        { label: 'quantityElectronic', index: 0, conditions: { value: quantity } },
      ]);

      // Step 6: Click "Save & close"
      // Known issue: "Name (code)" is marked as required after the first click, second click is needed
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: false });
      OrderLineEditForm.clickSaveAndCloseButton();
      PossibleDuplicateOrderLineModal.verifyModalView({ poLineNumber: firstPoLineNumber });

      // Step 7: Click "Submit" button
      PossibleDuplicateOrderLineModal.clickSubmitButton();
      InteractorsTools.checkCalloutMessage(OrderStates.orderLineCreatedSuccessfully);
      OrderLineDetails.waitLoading();
      OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${secondPoLineNumber}`);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: quantity },
          ],
        ],
      });

      // Step 8: Click left back arrow on the "PO line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.verifyPOLCount(2);
      OrderDetails.checkOrderLineInTableByIdentifier(firstPoLineNumber, [
        { columnName: poLinesTableColumns.POL_NUMBER },
        { columnName: poLinesTableColumns.TITLE, value: testData.instanceTitle },
        { columnName: poLinesTableColumns.PRODUCT_ID, value: testData.isbn },
        { columnName: poLinesTableColumns.VENDOR_REF_NUMBER, value: 'No value set-' },
        { columnName: poLinesTableColumns.FUND_CODE, value: '' },
        { columnName: poLinesTableColumns.ESTIMATED_PRICE, value: '10.00' },
      ]);
      OrderDetails.checkOrderLineInTableByIdentifier(secondPoLineNumber, secondPoLineTableColumns);

      // Step 9: Click "Actions" menu in "PO lines" accordion
      OrderDetails.expandPoLinesActionsDropdown();
      OrderDetails.checkPoLinesActionsMenuContent(allPoLinesTableColumns);

      // Step 10: Uncheck "Vendor reference number" and "Fund code" boxes
      OrderDetails.togglePoLinesColumns(toggledColumns);
      OrderDetails.checkOrderLineInTableByIdentifier(secondPoLineNumber, [
        { columnName: poLinesTableColumns.POL_NUMBER },
        { columnName: poLinesTableColumns.TITLE, value: testData.instanceTitle },
        { columnName: poLinesTableColumns.PRODUCT_ID, value: testData.isbn },
        { columnName: poLinesTableColumns.VENDOR_REF_NUMBER, absent: true },
        { columnName: poLinesTableColumns.FUND_CODE, absent: true },
        { columnName: poLinesTableColumns.ESTIMATED_PRICE, value: '0.00' },
      ]);

      // Step 11: Click "Actions" menu and check back "Vendor reference number" and "Fund code" boxes
      OrderDetails.expandPoLinesActionsDropdown();
      OrderDetails.togglePoLinesColumns(toggledColumns);
      OrderDetails.checkOrderLineInTableByIdentifier(secondPoLineNumber, secondPoLineTableColumns);
    },
  );
});
