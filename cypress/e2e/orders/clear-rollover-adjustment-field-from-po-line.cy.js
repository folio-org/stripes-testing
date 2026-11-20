import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_LOCALE_OBJECT,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_ORDER_TYPES,
  LOCATION_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  POLINE_FUND_DISTRIBUTION_COLUMNS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  Budgets,
  FiscalYears,
  LedgerRollovers,
  TransactionDetails,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../support/utils';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const code = CodeTools(4);
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    // Encumbrances are rolled over based on "Remaining"
    amounts: {
      // $10 - $3 paid = $7 is rolled over
      firstOrder: { unitPrice: 10, invoiceTotal: 3, rolledOver: 7, rolloverAdjustment: -3 },
      // Re-encumber is disabled, so nothing is rolled over
      secondOrder: { unitPrice: 20, rolledOver: 0, rolloverAdjustment: -20 },
      // ($15 + $15) + 20% increase = $36 is rolled over
      thirdOrder: {
        unitPrice: 15,
        total: 30,
        increaseBy: 20,
        rolledOver: 36,
        rolloverAdjustment: 6,
      },
    },
    ledger: {},
    fund: {},
    location: {},
    materialType: {},
    acquisitionMethod: {},
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderLine: {},
    thirdOrder: {},
    thirdOrderLine: {},
    invoice: {},
    user: {},
  };

  const formatAmount = (value) => NumberTools.formatCurrency(value, DEFAULT_LOCALE_OBJECT);
  // "Rollover adjustment" field displays a negative value with "-" sign instead of parentheses
  const formatRolloverAdjustment = (value) => {
    return NumberTools.formatCurrency(value, {
      ...DEFAULT_LOCALE_OBJECT,
      currencySign: 'standard',
    });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createFinanceData = () => {
    FiscalYears.createViaApi(testData.fiscalYears.second);

    const { ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      fiscalYear: testData.fiscalYears.first,
      budget: { allocated: 1000 },
    });

    testData.ledger = ledger;
    testData.fund = fund;
  };

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => {
        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        });
      })
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const getFundDistribution = ({ distributionType, value }) => [
    {
      code: testData.fund.code,
      fundId: testData.fund.id,
      distributionType,
      value,
    },
  ];

  const createOpenOrderWithOrderLine = ({ order, getOrderLine }) => {
    const data = {};

    return Orders.createOrderViaApi(order)
      .then((createdOrder) => {
        data.order = createdOrder;

        return OrderLines.createOrderLineViaApi(getOrderLine(createdOrder.id));
      })
      .then((orderLine) => {
        data.orderLine = orderLine;

        return Orders.updateOrderViaApi({ ...data.order, workflowStatus: ORDER_STATUSES.OPEN });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(data.orderLine.id))
      .then((orderLine) => ({ ...data, orderLine }));
  };

  // Order #1: one-time, re-encumber is enabled, physical resource
  const createFirstOrder = () => {
    return createOpenOrderWithOrderLine({
      order: {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      },
      getOrderLine: (purchaseOrderId) =>
        BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId,
          acquisitionMethod: testData.acquisitionMethod.id,
          listUnitPrice: testData.amounts.firstOrder.unitPrice,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
          fundDistribution: getFundDistribution({
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          }),
        }),
    }).then(({ order, orderLine }) => {
      testData.firstOrder = order;
      testData.firstOrderLine = orderLine;
    });
  };

  // Order #2: ongoing, re-encumber is disabled, electronic resource
  const createSecondOrder = () => {
    return createOpenOrderWithOrderLine({
      order: {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        reEncumber: false,
      },
      getOrderLine: (purchaseOrderId) => ({
        ...BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId,
          acquisitionMethod: testData.acquisitionMethod.id,
          fundDistribution: getFundDistribution({
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          }),
        }),
        orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
        cost: {
          currency: DEFAULT_LOCALE_OBJECT.currency,
          discountType: 'percentage',
          listUnitPriceElectronic: testData.amounts.secondOrder.unitPrice,
          quantityElectronic: 1,
        },
        locations: [{ locationId: testData.location.id, quantityElectronic: 1 }],
        eresource: {
          activated: false,
          trial: false,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          accessProvider: testData.organization.id,
          materialType: testData.materialType.id,
        },
      }),
    }).then(({ order, orderLine }) => {
      testData.secondOrder = order;
      testData.secondOrderLine = orderLine;
    });
  };

  // Order #3: ongoing subscription, re-encumber is enabled, P/E mix, fund distribution in amount
  const createThirdOrder = () => {
    return createOpenOrderWithOrderLine({
      order: {
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: true, manualRenewal: false, interval: 365 },
        }),
        reEncumber: true,
      },
      getOrderLine: (purchaseOrderId) => ({
        ...BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId,
          acquisitionMethod: testData.acquisitionMethod.id,
          fundDistribution: getFundDistribution({
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: testData.amounts.thirdOrder.total,
          }),
        }),
        orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
        cost: {
          currency: DEFAULT_LOCALE_OBJECT.currency,
          discountType: 'percentage',
          listUnitPrice: testData.amounts.thirdOrder.unitPrice,
          listUnitPriceElectronic: testData.amounts.thirdOrder.unitPrice,
          quantityPhysical: 1,
          quantityElectronic: 1,
        },
        locations: [
          { locationId: testData.location.id, quantityPhysical: 1, quantityElectronic: 1 },
        ],
        physical: {
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          materialType: testData.materialType.id,
          materialSupplier: testData.organization.id,
          volumes: [],
        },
        eresource: {
          activated: false,
          trial: false,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          accessProvider: testData.organization.id,
        },
      }),
    }).then(({ order, orderLine }) => {
      testData.thirdOrder = order;
      testData.thirdOrderLine = orderLine;
    });
  };

  // "Release encumbrance" is not active in the invoice line
  const createAndPayInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYears.first.id,
      poLineId: testData.firstOrderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: testData.firstOrderLine.fundDistribution,
      subTotal: testData.amounts.firstOrder.invoiceTotal,
      releaseEncumbrance: false,
      exportToAccounting: false,
    }).then((invoice) => {
      return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID }).then(
        () => {
          testData.invoice = invoice;
        },
      );
    });
  };

  const rolloverLedger = () => {
    return LedgerRollovers.createLedgerRolloverViaApi(
      LedgerRollovers.generateLedgerRollover({
        ledger: testData.ledger,
        fromFiscalYear: testData.fiscalYears.first,
        toFiscalYear: testData.fiscalYears.second,
        encumbrancesRollover: [
          {
            orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONGOING,
            basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.REMAINING,
          },
          {
            orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONGOING_SUBSCRIPTION,
            basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.REMAINING,
            increaseBy: testData.amounts.thirdOrder.increaseBy,
          },
          {
            orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
            basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.REMAINING,
          },
        ],
      }),
    );
  };

  const updateFiscalYearDates = (fiscalYear, offset) => {
    return FiscalYears.getViaApi({ query: `id==${fiscalYear.id}` }).then(({ fiscalYears }) => {
      return FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears[0],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      });
    });
  };

  // The second fiscal year becomes the current one
  const shiftFiscalYearDates = () => {
    return updateFiscalYearDates(testData.fiscalYears.first, -1).then(() => {
      return updateFiscalYearDates(testData.fiscalYears.second, 0);
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiFinanceViewFundAndBudget.gui])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createFinanceData)
      .then(fetchReferenceData)
      .then(createFirstOrder)
      .then(createAndPayInvoice)
      .then(createSecondOrder)
      .then(createThirdOrder)
      .then(rolloverLedger)
      .then(shiftFiscalYearDates)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.firstOrderLine, testData.secondOrderLine, testData.thirdOrderLine].forEach(
      (orderLine) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
      },
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1003533 Clear rollover adjustment field from PO line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1003533', 'nonParallel'] },
    () => {
      const { firstOrder, secondOrder, thirdOrder } = testData.amounts;

      // Step 1: Click on the Order #1 number
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
            value: formatAmount(firstOrder.rolledOver),
          },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED,
            value: formatAmount(firstOrder.rolledOver),
          },
        ],
      });

      // Step 2: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: formatAmount(firstOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: formatAmount(firstOrder.rolledOver),
          },
          {
            key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
            value: formatRolloverAdjustment(firstOrder.rolloverAdjustment),
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(firstOrder.rolledOver),
          initialEncumbrance: formatAmount(firstOrder.rolledOver),
          currentEncumbrance: formatAmount(firstOrder.rolledOver),
        },
      ]);

      // Step 3: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(firstOrder.unitPrice) },
        {
          key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
          value: formatRolloverAdjustment(firstOrder.rolloverAdjustment),
        },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(firstOrder.rolledOver),
        },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(firstOrder.rolledOver),
        },
      ]);

      // Step 4: Click "x" icon next to the "Rollover adjustment" field
      OrderLineEditForm.clickClearRolloverAdjustmentButton();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(firstOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, value: formatRolloverAdjustment(0) },
        { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(firstOrder.unitPrice) },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(firstOrder.unitPrice),
        },
      ]);

      // Step 5-6: Click "Cancel" button, then "Close without saving" button
      OrderLineEditForm.cancelWithUnsavedChanges({ waitMs: 1000 });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: formatAmount(firstOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: formatAmount(firstOrder.rolledOver),
          },
          {
            key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
            value: formatRolloverAdjustment(firstOrder.rolloverAdjustment),
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(firstOrder.rolledOver),
          initialEncumbrance: formatAmount(firstOrder.rolledOver),
          currentEncumbrance: formatAmount(firstOrder.rolledOver),
        },
      ]);

      // Step 7: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(firstOrder.unitPrice) },
        {
          key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
          value: formatRolloverAdjustment(firstOrder.rolloverAdjustment),
        },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(firstOrder.rolledOver),
        },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(firstOrder.rolledOver),
        },
      ]);

      // Step 8: Click "x" icon next to the "Rollover adjustment" field
      OrderLineEditForm.clickClearRolloverAdjustmentButton();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, value: formatRolloverAdjustment(0) },
        { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(firstOrder.unitPrice) },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(firstOrder.unitPrice),
        },
      ]);

      // Step 9: Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: formatAmount(firstOrder.unitPrice),
          },
          { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(firstOrder.unitPrice) },
          { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(firstOrder.unitPrice),
          initialEncumbrance: formatAmount(firstOrder.unitPrice),
          currentEncumbrance: formatAmount(firstOrder.unitPrice),
        },
      ]);

      // Step 10: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(firstOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(firstOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(firstOrder.unitPrice),
        },
      ]);

      // Step 11: Close the edit page, click on the "Current encumbrance" hyperlink
      OrderLineEditForm.clickCancelButton(false, { waitMs: 1000 });
      OrderLineDetails.waitLoading();
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: formatAmount(-firstOrder.unitPrice) },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.firstOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: formatAmount(firstOrder.unitPrice),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 12: Navigate to the Order #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
            value: formatAmount(secondOrder.rolledOver),
          },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED,
            value: formatAmount(secondOrder.rolledOver),
          },
        ],
      });

      // Step 13: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
            value: formatAmount(secondOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: formatAmount(secondOrder.rolledOver),
          },
          {
            key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
            value: formatRolloverAdjustment(secondOrder.rolloverAdjustment),
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(secondOrder.rolledOver),
          initialEncumbrance: formatAmount(secondOrder.rolledOver),
          currentEncumbrance: formatAmount(secondOrder.rolledOver),
        },
      ]);

      // Step 14: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
          value: String(secondOrder.unitPrice),
        },
        {
          key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
          value: formatRolloverAdjustment(secondOrder.rolloverAdjustment),
        },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(secondOrder.rolledOver),
        },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(secondOrder.rolledOver),
        },
      ]);

      // Step 15: Click "x" icon next to the "Rollover adjustment" field
      OrderLineEditForm.clickClearRolloverAdjustmentButton();
      OrderLineEditForm.checkCostDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
          value: String(secondOrder.unitPrice),
        },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, value: formatRolloverAdjustment(0) },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(secondOrder.unitPrice),
        },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(secondOrder.unitPrice),
        },
      ]);

      // Step 16: Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
            value: formatAmount(secondOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: formatAmount(secondOrder.unitPrice),
          },
          { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(secondOrder.unitPrice),
          initialEncumbrance: formatAmount(secondOrder.unitPrice),
          currentEncumbrance: formatAmount(0),
        },
      ]);

      // Step 17: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
          value: String(secondOrder.unitPrice),
        },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(secondOrder.unitPrice),
        },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(secondOrder.unitPrice),
        },
      ]);

      // Step 18: Close the edit page, click on the "Current encumbrance" hyperlink
      OrderLineEditForm.clickCancelButton(false, { waitMs: 1000 });
      OrderLineDetails.waitLoading();
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.secondOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: formatAmount(secondOrder.unitPrice),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });

      // Step 19: Navigate to the Order #3
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.selectOrderByPONumber(testData.thirdOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
            value: formatAmount(thirdOrder.rolledOver),
          },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED,
            value: formatAmount(thirdOrder.rolledOver),
          },
        ],
      });

      // Step 20: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: formatAmount(thirdOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
            value: formatAmount(thirdOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: formatAmount(thirdOrder.rolledOver),
          },
          {
            key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
            value: formatRolloverAdjustment(thirdOrder.rolloverAdjustment),
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(thirdOrder.rolledOver),
          initialEncumbrance: formatAmount(thirdOrder.rolledOver),
          currentEncumbrance: formatAmount(thirdOrder.rolledOver),
        },
      ]);

      // Step 21: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        {
          key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT,
          value: formatRolloverAdjustment(thirdOrder.rolloverAdjustment),
        },
        {
          key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
          value: formatAmount(thirdOrder.rolledOver),
        },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(thirdOrder.rolledOver),
        },
      ]);

      // Step 22: Click "x" icon next to the "Rollover adjustment" field
      OrderLineEditForm.clickClearRolloverAdjustmentButton();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, value: formatRolloverAdjustment(0) },
        { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(thirdOrder.total) },
      ]);
      // Fund distribution amount is still the rolled over one, so the difference has to be distributed
      OrderLineEditForm.checkRemainingAmountToBeDistributed(
        formatRolloverAdjustment(thirdOrder.total - thirdOrder.rolledOver),
      );
      OrderLineEditForm.checkFundDistributionSection([
        {
          key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          value: formatAmount(thirdOrder.rolledOver),
        },
      ]);

      // Step 23: Edit the "Value" field so that it matches the "Estimated price", click "Save & close"
      OrderLineEditForm.setFundDistributionValue(String(thirdOrder.total), 0);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: formatAmount(thirdOrder.unitPrice),
          },
          {
            key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE,
            value: formatAmount(thirdOrder.unitPrice),
          },
          { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(thirdOrder.total) },
          { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: formatAmount(thirdOrder.total),
          initialEncumbrance: formatAmount(thirdOrder.total),
          currentEncumbrance: formatAmount(thirdOrder.total),
        },
      ]);

      // Step 24: Click "Actions" button, select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE, value: String(thirdOrder.unitPrice) },
        { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: formatAmount(thirdOrder.total) },
        { key: POLINE_DETAILS_FIELDS.ROLLOVER_ADJUSTMENT, absent: true },
      ]);
      OrderLineEditForm.checkFundDistributionSection([
        { key: POLINE_FUND_DISTRIBUTION_COLUMNS.AMOUNT, value: formatAmount(thirdOrder.total) },
      ]);

      // Step 25: Close the edit page, click on the "Current encumbrance" hyperlink
      OrderLineEditForm.clickCancelButton(false, { waitMs: 1000 });
      OrderLineDetails.waitLoading();
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: formatAmount(-thirdOrder.total) },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.thirdOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: formatAmount(thirdOrder.total),
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: formatAmount(0) },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
