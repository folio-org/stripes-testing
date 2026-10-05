import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import SelectInstanceModal from '../../support/fragments/orders/modals/selectInstanceModal';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';

describe('Orders', () => {
  const polData = {
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
      orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
      receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
    },
  };

  let testData;

  before('Create test data', () => {
    testData = {
      instanceTitle: `AT_C784511_FolioInstance_${getRandomPostfix()}`,
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C784511_Organization_${getRandomPostfix()}`,
      },
    };

    cy.getAdminToken();
    // "Loc 1" is assigned to the Fund, "Loc 2" is used for the Instance holding
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.fundLocation, testData.holdingLocation] = locations;
    });

    // Preconditions 1-3: Fund restricted by location (Loc 1) with current budget
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `AT_C784511_Ledger_${getRandomPostfix()}`,
        fiscalYearOneId: fiscalYear.id,
      }).then((ledger) => {
        testData.ledger = ledger;

        Funds.createViaApi({
          ...Funds.getDefaultFund(),
          name: `AT_C784511_Fund_${getRandomPostfix()}`,
          ledgerId: ledger.id,
          restrictByLocations: true,
          locations: [{ locationId: testData.fundLocation.id }],
        }).then(({ fund }) => {
          testData.fund = fund;

          Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            name: `AT_C784511_Budget_${getRandomPostfix()}`,
            fiscalYearId: fiscalYear.id,
            fundId: fund.id,
            allocated: 100,
          }).then((budget) => {
            testData.budget = budget;
          });
        });
      });
    });

    // Precondition 4: Instance with one holding that differs from the Fund location (Loc 2)
    cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
      cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: holdingTypes[0].id,
              permanentLocationId: testData.holdingLocation.id,
            },
          ],
        });
      });
    });

    // Precondition 5: Order in "Pending" status without PO lines
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organizationId })).then(
        (order) => {
          testData.order = order;
        },
      );
    });

    // Precondition 6: User with required permissions is logged in
    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        // Precondition 7: User is on the Orders app with the search result for the order
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C784511 Fund restriction validation works correctly when a new holding is created (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C784511'] },
    () => {
      // Step 1: Click on "PO number" link on "Orders" pane for the order from Preconditions
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" button in the "PO lines" accordion and select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 3: Click "Title look-up", search for the Instance from preconditions and click on it
      OrderLineEditForm.clickTitleLookUpButton();
      SelectInstanceModal.searchByName(testData.instanceTitle);
      SelectInstanceModal.selectInstance();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instanceTitle } },
      ]);

      // Step 4: Fill in "Acquisition method", "Order format", "Receiving workflow",
      // "Physical unit price", "Quantity physical", "Create inventory" and "Material type"
      OrderLineEditForm.fillOrderLineFields(polData);
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'orderFormat',
          conditions: { checkedOptionText: polData.poLineDetails.orderFormat },
        },
        {
          label: 'checkinItems',
          conditions: { checkedOptionText: polData.poLineDetails.receivingWorkflow },
        },
      ]);
      OrderLineEditForm.checkCostDetailsSection([
        {
          label: 'physicalUnitPrice',
          conditions: { value: polData.costDetails.physicalUnitPrice },
        },
        { label: 'quantityPhysical', conditions: { value: polData.costDetails.quantityPhysical } },
      ]);
      OrderLineEditForm.checkPhysicalResourceDetailsSection([
        {
          label: 'createInventory',
          conditions: { checkedOptionText: polData.poLineDetails.createInventory },
        },
      ]);

      // Step 5: Click "Add fund distribution" and select Fund from Preconditions in "Fund ID" dropdown
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fund.name, testData.fund.code);
      OrderLineEditForm.assertFundDistributionFund({
        fundName: testData.fund.name,
        fundCode: testData.fund.code,
      });

      // Step 6: Click "Add location" button and "Create new holdings for location" link
      OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.verifyModalView();
      SelectLocationModal.checkLocationsList([testData.fundLocation.name], { exactMatch: true });

      // Step 7: Click on the location name in the "Select locations" modal, enter 1 in "Quantity physical"
      SelectLocationModal.selectLocation(testData.fundLocation.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
      OrderLineEditForm.checkLocationsSection([
        {
          label: 'newHoldingLocation',
          conditions: {
            value: `${testData.fundLocation.name}(${testData.fundLocation.code})`,
            disabled: true,
          },
        },
        { label: 'quantityPhysical', conditions: { value: '1' } },
      ]);

      // Step 8: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.fundLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });

      // Step 9: Click back arrow on the "PO Line details" pane, click "Actions" -> "Open" and "Submit"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 10: Click on the PO line record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.instanceTitle);
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.fundLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });
      OrderLineEditForm.checkFundRestrictionErrorToastAbsent();
    },
  );
});
