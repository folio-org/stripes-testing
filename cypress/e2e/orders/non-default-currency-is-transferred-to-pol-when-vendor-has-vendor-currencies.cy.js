import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCIES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  POLINE_DETAILS_FIELDS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const vendorCurrency = {
    code: 'GEL',
    label: CURRENCIES.GEL,
  };
  const unitPrice = '10';
  const exchangeRate = '3';
  const encumbranceAmount = '$30.00';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C440109_Organization_${getRandomPostfix()}`,
      vendorCurrencies: [vendorCurrency.code],
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C440109_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C440109_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 1000,
    };
    testData.polData = {
      itemDetails: {
        title: `AT_C440109_POLTitle_${getRandomPostfix()}`,
      },
      poLineDetails: {
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        materialType: MATERIAL_TYPE_NAMES.TEXT,
      },
      costDetails: {
        physicalUnitPrice: unitPrice,
        quantityPhysical: '1',
        exchangeRate,
      },
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organizationId })).then(
        (order) => {
          testData.order = order;
        },
      );
    });

    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.polData.itemDetails.title);
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C440109 Non-default currency is transferred to POL when Organization-vendor has specified "Vendor currencies" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440109'] },
    () => {
      // Step 1: Click "Actions" -> "Add PO line" in "PO lines" accordion
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 2: "Currency" is prepopulated with vendor currency, "Use set exchange rate" is checked and inactive
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: vendorCurrency.label } },
        { label: 'useSetExchangeRate', conditions: { checked: true, readOnly: true } },
        { label: 'exchangeRate', conditions: { disabled: false } },
      ]);

      // Step 3: Fill in the mandatory fields on "Add PO line" page
      OrderLineEditForm.fillOrderLineFields(testData.polData);
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.addFundDistribution({ fund: testData.fund.name, index: 0, amount: '100' });
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        physicalQuantity: '1',
      });

      // Step 4: Click "Save & close" - PO line is created with vendor currency
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [{ key: POLINE_DETAILS_FIELDS.CURRENCY, value: vendorCurrency.code }],
      });

      // Step 5: Click "Back to PO" arrow on POL details pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();

      // Step 6: Open purchase order
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });

      // Step 7: Click on just created POL record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.polData.itemDetails.title);

      // Step 8: "Current encumbrance" equals <Unit price> * <Exchange rate> in default currency
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: encumbranceAmount },
      ]);

      // Step 9: Click on the link in "Current encumbrance" column
      const TransactionDetails = OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `(${encumbranceAmount})` },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.order.poNumber}-1` },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
        ],
      });
    },
  );
});
