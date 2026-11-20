import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  ROLLOVER_BUDGET_VALUE_AS_LABELS,
} from '../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  Ledgers,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';

describe('Orders', () => {
  const code = CodeTools(4);
  const currentYear = new Date().getFullYear();
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
    ledgerA: {},
    ledgerB: {},
    fundA: {},
    fundB: {},
    acquisitionMethod: {},
    adminUser: {},
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderFirstLine: {},
    secondOrderSecondLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createFiscalYears = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first)
      .then((fiscalYear) => {
        testData.fiscalYears.first = fiscalYear;

        return FiscalYears.createViaApi(testData.fiscalYears.second);
      })
      .then((fiscalYear) => {
        testData.fiscalYears.second = fiscalYear;
      });
  };

  const createLedgerWithFund = () => {
    const data = {};

    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears.first.id,
      restrictEncumbrance: true,
      restrictExpenditures: true,
    })
      .then((ledger) => {
        data.ledger = ledger;

        return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: ledger.id });
      })
      .then(({ fund }) => {
        data.fund = fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: fund.id,
          allocated: 1000,
        });
      })
      .then(() => data);
  };

  const createFinanceData = () => {
    return createLedgerWithFund()
      .then(({ ledger, fund }) => {
        testData.ledgerA = ledger;
        testData.fundA = fund;

        return createLedgerWithFund();
      })
      .then(({ ledger, fund }) => {
        testData.ledgerB = ledger;
        testData.fundB = fund;
      });
  };

  const fetchReferenceData = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      })
      .then(() => cy.getAdminUserDetails())
      .then((adminUser) => {
        testData.adminUser = adminUser;
      });
  };

  const getOrderLine = ({ purchaseOrderId, listUnitPrice, funds }) => {
    return BasicOrderLine.getDefaultOrderLine({
      purchaseOrderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      listUnitPrice,
      fundDistribution: funds.map((fund) => ({
        code: fund.code,
        fundId: fund.id,
        distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        value: 100 / funds.length,
      })),
    });
  };

  const createOrder = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    });
  };

  const openOrder = (order) => {
    return Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
  };

  // Order #1: one PO line with Fund A and Fund B (50/50 %)
  const createFirstOrder = () => {
    return createOrder()
      .then((order) => {
        testData.firstOrder = order;

        return OrderLines.createOrderLineViaApi(
          getOrderLine({
            purchaseOrderId: order.id,
            listUnitPrice: 100,
            funds: [testData.fundA, testData.fundB],
          }),
        );
      })
      .then(() => openOrder(testData.firstOrder))
      .then(() =>
        OrderLines.getOrderLineViaApi({ query: `purchaseOrderId==${testData.firstOrder.id}` }),
      )
      .then(([orderLine]) => {
        testData.firstOrderLine = orderLine;
      });
  };

  // Order #2: PO line #1 with Fund A, PO line #2 with Fund B
  const createSecondOrder = () => {
    return createOrder()
      .then((order) => {
        testData.secondOrder = order;

        return OrderLines.createOrderLineViaApi(
          getOrderLine({ purchaseOrderId: order.id, listUnitPrice: 10, funds: [testData.fundA] }),
        );
      })
      .then((orderLine) => {
        testData.secondOrderFirstLine = orderLine;

        return OrderLines.createOrderLineViaApi(
          getOrderLine({
            purchaseOrderId: testData.secondOrder.id,
            listUnitPrice: 20,
            funds: [testData.fundB],
          }),
        );
      })
      .then((orderLine) => {
        testData.secondOrderSecondLine = orderLine;

        return openOrder(testData.secondOrder);
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.secondOrderFirstLine.id))
      .then((orderLine) => {
        testData.secondOrderFirstLine = orderLine;
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewEditFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      ])
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
    OrderLinesLimit.setPOLLimitViaApi(2);

    createOrganization()
      .then(createFiscalYears)
      .then(createFinanceData)
      .then(fetchReferenceData)
      .then(createFirstOrder)
      .then(createSecondOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.firstOrder, testData.secondOrder].forEach(({ id }) => {
      Orders.getOrderByIdViaApi(id).then((order) => {
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
        Orders.deleteOrderViaApi(order.id, false);
      });
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C986311 Fiscal year in purchase order view displays only one fiscal year when the PO line has fund distributions from different ledgers and check metadata in the POL (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C986311'] },
    () => {
      // Step 1: Click on the Order #1 number
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$100.00' },
        ],
      });

      // Step 2: Expand "Fiscal year" dropdown
      OrderDetails.checkFiscalYearDropdownOptions({
        current: [testData.fiscalYears.first.code],
        previous: [],
      });

      // Step 3: Search for the Order #2 and click on it
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$30.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$30.00' },
        ],
      });

      // Step 4: Expand "Fiscal year" dropdown
      OrderDetails.checkFiscalYearDropdownOptions({
        current: [testData.fiscalYears.first.code],
        previous: [],
      });

      // Step 5: Navigate to the Ledger A, click "Actions" button, select "Rollover" option
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.selectLedgersNavigation();
      FinanceHelper.searchByName(testData.ledgerA.name);
      Ledgers.selectLedger(testData.ledgerA.name);
      LedgerDetails.openLedgerRolloverEditForm();

      // Step 6: Perform a rollover for the Ledger A
      LedgerRolloverDetails.fillLedgerRolloverFields({
        fiscalYear: testData.fiscalYears.second.code,
        rolloverBudgets: [
          {
            checked: true,
            rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
            rolloverValue: ROLLOVER_BUDGET_VALUE_AS_LABELS.ALLOCATION,
          },
        ],
        rolloverEncumbrance: {
          ongoing: { basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE },
          ongoingSubscription: {
            basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
          },
          oneTime: { basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE },
        },
      });
      LedgerRolloverDetails.clickRolloverButton();
      LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails({ successful: false });
      LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
      LedgerDetails.waitLoading();

      // Step 7: Perform the rollover for the Ledger B with the same settings
      FinanceHelper.searchByName(testData.ledgerB.name);
      Ledgers.selectLedger(testData.ledgerB.name);
      LedgerDetails.openLedgerRolloverEditForm();
      LedgerRolloverDetails.fillLedgerRolloverFields({
        fiscalYear: testData.fiscalYears.second.code,
        rolloverBudgets: [
          {
            checked: true,
            rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
            rolloverValue: ROLLOVER_BUDGET_VALUE_AS_LABELS.ALLOCATION,
          },
        ],
        rolloverEncumbrance: {
          ongoing: { basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE },
          ongoingSubscription: {
            basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
          },
          oneTime: { basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE },
        },
      });
      LedgerRolloverDetails.clickRolloverButton();
      LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();
      LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
      LedgerDetails.waitLoading();

      // Step 8: Change the dates of the fiscal years so that the second fiscal year period includes current date
      FinanceHelper.selectFiscalYearsNavigation();
      FinanceHelper.searchByName(testData.fiscalYears.first.name);
      FiscalYears.selectFY(testData.fiscalYears.first.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        `01/01/${currentYear - 1}`,
        `12/31/${currentYear - 1}`,
      );
      FinanceHelper.searchByName(testData.fiscalYears.second.name);
      FiscalYears.selectFY(testData.fiscalYears.second.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        `01/01/${currentYear}`,
        `12/31/${currentYear}`,
      );

      // Step 9: Navigate to the "Orders" app, open the Order #1 and expand "Fiscal year" dropdown
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkFiscalYearDropdownOptions({
        current: [testData.fiscalYears.second.code],
        previous: [testData.fiscalYears.first.code],
      });
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$100.00' },
        ],
      });

      // Step 10: Click on the PO line record and check metadata in the PO line response
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.getOrderLineByIdViaApi(testData.firstOrderLine.id).then(({ metadata }) => {
        expect(metadata.createdDate).to.equal(testData.firstOrderLine.metadata.createdDate);
        expect(metadata.createdByUserId).to.equal(testData.adminUser.id);
        expect(new Date(metadata.updatedDate)).to.be.greaterThan(new Date(metadata.createdDate));
        expect(metadata.updatedByUserId).to.equal(testData.user.userId);
      });

      // Step 11: Search for the Order #2, click on it and expand "Fiscal year" dropdown
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkFiscalYearDropdownOptions({
        current: [testData.fiscalYears.second.code],
        previous: [testData.fiscalYears.first.code],
      });
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$30.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$30.00' },
        ],
      });

      // Step 12: Click on the PO line #1 record and check metadata in the PO line response
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.getOrderLineByIdViaApi(testData.secondOrderFirstLine.id).then(({ metadata }) => {
        expect(metadata.createdDate).to.equal(testData.secondOrderFirstLine.metadata.createdDate);
        expect(metadata.createdByUserId).to.equal(testData.adminUser.id);
        expect(new Date(metadata.updatedDate)).to.be.greaterThan(new Date(metadata.createdDate));
        expect(metadata.updatedByUserId).to.equal(testData.user.userId);
      });
    },
  );
});
