import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderTemplateForm from '../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../support/fragments/settings/orders/orderTemplates';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import SettingOrdersNavigationMenu from '../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';

describe('Orders', () => {
  const quantityPhysical = '1';
  const unitPrice = '10';
  let testData;

  const createFinanceData = () => {
    return FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      return Ledgers.createViaApi({
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      }).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: true,
          locations: [{ locationId: testData.locations.restrictedLocation.id }],
        }).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 100,
          }).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  before('Create test data', () => {
    testData = {
      fiscalYear: {},
      ledger: {},
      fund: {},
      budget: {},
      locations: {
        restrictedLocation: {},
        otherLocation: {},
      },
      organization: NewOrganization.getDefaultOrganization(),
      orderTemplate: {
        ...OrderTemplates.getDefaultOrderTemplate({}),
        templateName: `AT_C436752_OrderTemplate_${getRandomPostfix()}`,
      },
      orderLineTitle: `AT_C436752_OrderLine_${getRandomPostfix()}`,
      poNumber: null,
      polNumber: null,
      user: {},
    };

    cy.getAdminToken();
    cy.clearLocalStorage();
    return Locations.getViaApiAnyDefault(2)
      .then(([restrictedLocation, otherLocation]) => {
        testData.locations = { restrictedLocation, otherLocation };
      })
      .then(() => createFinanceData())
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate))
      .then(() => {
        cy.createTempUser([
          Permissions.uiSettingsOrdersCanViewEditOrderTemplates.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersApprovePurchaseOrders.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      if (testData.poNumber) {
        Orders.getOrdersApi({ query: `poNumber=="${testData.poNumber}"` }).then((orders) => {
          if (orders?.length) {
            Orders.deleteOrderViaApi(orders[0].id);
          }
        });
      }
      OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C436752 Order created from template with incompatible Fund and Location could not be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436752'] },
    () => {
      const { restrictedLocation, otherLocation } = testData.locations;

      // Step 1: Click on Template created in precondition
      OrderTemplates.selectTemplate(testData.orderTemplate.templateName);

      // Step 2: Click on "Actions" button and select "Edit"
      OrderTemplates.openEditForm();

      // Step 3: Expand "Location" accordion and click "Add location" button
      OrderTemplateForm.clickExpandAllAccordions();
      OrderTemplateForm.clickAddLocationButton();

      // Step 4: Expand "Name (code)" dropdown - contains all locations
      OrderTemplateForm.expandLocationNameCodeDropdown(0);
      cy.expect([
        OrderTemplateForm.locationOptionExists(restrictedLocation.name),
        OrderTemplateForm.locationOptionExists(otherLocation.name),
      ]);

      // Step 5: Select any Location except the one related to the Fund
      OrderTemplateForm.selectLocationFromDropdown(otherLocation.name);
      OrderTemplateForm.verifyLocationSelected({ location: otherLocation.name });

      // Step 6: Enter "1" in "Quantity" field next to selected Location
      OrderLines.setPhysicalQuantity({ quantity: quantityPhysical, changeQuantity: false });

      // Step 7: Expand "Fund distribution" accordion and click "Add fund distribution" button
      OrderTemplateForm.clickAddFundDistributionButton();

      // Step 8: Pick the restricted Fund from "Fund ID" dropdown
      OrderTemplateForm.selectFundDistribution({
        fundName: testData.fund.name,
        fundCode: testData.fund.code,
      });
      OrderTemplateForm.verifyFundDistributionSelected({ fundCode: testData.fund.code });

      // Step 9: Click "Save" button
      OrderTemplateForm.clickSaveButton();
      OrderTemplates.checkTemplateCreated(testData.orderTemplate.templateName);

      // Step 10: Go to "Orders" app with toggle set on "Orders"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();

      // Step 11: Click "Actions" button and select "New"
      const OrderEditForm = Orders.clickCreateNewOrder();
      OrderEditForm.checkOrderFormContent();

      // Step 12: Select Template name from precondition
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);

      // Step 13: Fill in mandatory fields "Vendor" and "Order type"
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organization.name,
        orderType: ORDER_TYPES.ONE_TIME,
      });

      // Step 14: Click "Save & close" button
      OrderEditForm.clickSaveButton();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 15: Click "Actions" on "PO lines" accordion and select "Add PO line"
      const OrderLineEditForm = OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkFundDistributionFundSelected({ fund: testData.fund.code });
      OrderLineEditForm.checkLocationSelected({ location: otherLocation.name });

      // Step 16: Fill in Title, Acquisition method, Order format, Unit price, Quantity, Material type
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.orderLineTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          materialType: MATERIAL_TYPE_NAMES.TEXT,
        },
        costDetails: {
          physicalUnitPrice: unitPrice,
          quantityPhysical,
        },
      });

      // Step 17: Click "Save & close" button on "Add PO line" page
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [[{ key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: otherLocation.name }]],
      });
      OrderLines.getAssignedPOLNumber().then((polNumber) => {
        testData.polNumber = polNumber;
        testData.poNumber = polNumber.split('-')[0];

        // Step 18: Click "Back to PO" arrow on "PO Line details" pane
        OrderLineDetails.backToOrderDetails();
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Step 19: Open order - error toast appears and order is not opened
        Orders.openOrder();
        Orders.checkInvalidLocationErrorMessage(testData.polNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      });
    },
  );
});
