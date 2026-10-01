import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  FUNDING_INFORMATION_NAMES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_ROLLOVER_ORDER_TYPES,
  LEDGER_VIEW_FIELDS,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  TRANSACTION_TYPES,
} from '../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYearDetails,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRollovers,
  Ledgers,
  Transactions,
} from '../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Invoices } from '../../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const MONEY = {
  FUND_A_INITIAL_ALLOCATION: 100,
  FUND_A_ALLOCATION_INCREASE: 50,
  FUND_B_INITIAL_ALLOCATION: 200,
  FUND_B_ALLOCATION_DECREASE: 50,
  ALLOWABLE_PERCENT: 110,
  ORDER_1_TOTAL_COST: 310,
  INVOICE_1_AMOUNT: 310,
  INVOICE_2_AMOUNT: -10,
  INVOICE_3_AMOUNT: 15,
  ORDER_2_TOTAL_COST: 5,
  INVOICE_4_AMOUNT: 5,
  FUND_C_CURRENT_ALLOCATION: 1000,
  FUND_C_PLANNED_ALLOCATION: 500,
  FUND_D_CURRENT_ALLOCATION: 1000,
  FUND_D_PLANNED_ALLOCATION: 500,
  TRANSFER_D_TO_C: 50,
};

const FISCAL_YEAR_OFFSETS = { FIRST: 0, SECOND: 1, THIRD: 2 };

describe('Finance', () => {
  describe('Ledgers', () => {
    const code = CodeTools(4);

    const testData = {
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(FISCAL_YEAR_OFFSETS.FIRST),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(FISCAL_YEAR_OFFSETS.SECOND),
        },
        third: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${code}${StringTools.randomTwoDigitNumber()}03`,
          ...DateTools.getFullFiscalYearStartAndEnd(FISCAL_YEAR_OFFSETS.THIRD),
        },
      },
      organization: { ...NewOrganization.defaultUiOrganizations },
      ledgerA: {},
      ledgerB: {},
      fundA: {},
      fundB: {},
      fundC: {},
      fundD: {},
      order1: {},
      orderLine1: {},
      order2: {},
      orderLine2: {},
      invoice4: {},
      acquisitionMethodId: null,
      user: {},
      locale: 'en-US',
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then(
        (fiscalYearResponse) => {
          testData.fiscalYears[fiscalYearKey] = fiscalYearResponse;
        },
      );
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first')
        .then(() => createFiscalYear('second'))
        .then(() => createFiscalYear('third'));
    };

    const createLedgerA = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledgerA_${getRandomPostfix()}`,
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledgerResponse) => {
        testData.ledgerA = ledgerResponse;
      });
    };

    const createFundWithBudget = ({ fundKey, letter, ledger, fiscalYear, allocated }) => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fund${letter}_${getRandomPostfix()}`,
        ledgerId: ledger.id,
      }).then((fundResponse) => {
        testData[fundKey] = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fundId: testData[fundKey].id,
          fiscalYearId: fiscalYear.id,
          allocated,
          allowableEncumbrance: MONEY.ALLOWABLE_PERCENT,
          allowableExpenditure: MONEY.ALLOWABLE_PERCENT,
        });
      });
    };

    const createFundAWithBudget = () => createFundWithBudget({
      fundKey: 'fundA',
      letter: 'A',
      ledger: testData.ledgerA,
      fiscalYear: testData.fiscalYears.first,
      allocated: MONEY.FUND_A_INITIAL_ALLOCATION,
    });

    const changeFundAllocation = ({ fund, fiscalYear, amount, isIncrease }) => {
      return Transactions.createAllocationViaApi({
        fiscalYearId: fiscalYear.id,
        amount,
        ...(isIncrease ? { toFundId: fund.id } : { fromFundId: fund.id }),
      });
    };

    const increaseFundAAllocation = () => changeFundAllocation({
      fund: testData.fundA,
      fiscalYear: testData.fiscalYears.first,
      amount: MONEY.FUND_A_ALLOCATION_INCREASE,
      isIncrease: true,
    });

    const createFundBWithBudget = () => createFundWithBudget({
      fundKey: 'fundB',
      letter: 'B',
      ledger: testData.ledgerA,
      fiscalYear: testData.fiscalYears.first,
      allocated: MONEY.FUND_B_INITIAL_ALLOCATION,
    });

    const decreaseFundBAllocation = () => changeFundAllocation({
      fund: testData.fundB,
      fiscalYear: testData.fiscalYears.first,
      amount: MONEY.FUND_B_ALLOCATION_DECREASE,
      isIncrease: false,
    });

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then(
        (organizationId) => {
          testData.organization.id = organizationId;
        },
      );
    };

    const getAcquisitionMethodId = () => {
      if (testData.acquisitionMethodId) {
        return cy.wrap(testData.acquisitionMethodId);
      }

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
          return testData.acquisitionMethodId;
        });
    };

    const createOneTimeOrderWithLine = ({
      orderKey,
      orderLineKey,
      totalCost,
      fundDistribution,
    }) => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      })
        .then((order) => {
          testData[orderKey] = order;

          return getAcquisitionMethodId();
        })
        .then((acquisitionMethodId) => OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: acquisitionMethodId,
            purchaseOrderId: testData[orderKey].id,
            listUnitPrice: totalCost,
            poLineEstimatedPrice: totalCost,
            fundDistribution,
          }),
        ))
        .then((orderLine) => {
          testData[orderLineKey] = orderLine;

          return Orders.updateOrderViaApi({
            ...testData[orderKey],
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createOrder1WithLine = () => createOneTimeOrderWithLine({
      orderKey: 'order1',
      orderLineKey: 'orderLine1',
      totalCost: MONEY.ORDER_1_TOTAL_COST,
      fundDistribution: [testData.fundA, testData.fundB].map((fund) => ({
        fundId: fund.id,
        distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        value: 50,
      })),
    });

    const payInvoiceForOrderLine = ({ fiscalYear, orderLine, subTotal }) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: fiscalYear.id,
        poLineId: orderLine.id,
        fundDistributions: orderLine.fundDistribution,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        subTotal,
        releaseEncumbrance: true,
        exportToAccounting: true,
      }).then((invoice) => Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID }));
    };

    const payInvoicesForOrder1 = () => {
      return payInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.first,
        orderLine: testData.orderLine1,
        subTotal: MONEY.INVOICE_1_AMOUNT,
      })
        .then(() => payInvoiceForOrderLine({
          fiscalYear: testData.fiscalYears.first,
          orderLine: testData.orderLine1,
          subTotal: MONEY.INVOICE_2_AMOUNT,
        }))
        .then(() => payInvoiceForOrderLine({
          fiscalYear: testData.fiscalYears.first,
          orderLine: testData.orderLine1,
          subTotal: MONEY.INVOICE_3_AMOUNT,
        }));
    };

    const createOrder2WithLine = () => createOneTimeOrderWithLine({
      orderKey: 'order2',
      orderLineKey: 'orderLine2',
      totalCost: MONEY.ORDER_2_TOTAL_COST,
      fundDistribution: [
        {
          fundId: testData.fundA.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    });

    const createOpenInvoice4ForOrder2 = () => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYears.first.id,
        poLineId: testData.orderLine2.id,
        fundDistributions: testData.orderLine2.fundDistribution,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        subTotal: MONEY.INVOICE_4_AMOUNT,
        releaseEncumbrance: true,
        exportToAccounting: true,
      }).then((invoice) => {
        testData.invoice4 = invoice;
      });
    };

    const rolloverLedgerA = ({ fromFiscalYear, toFiscalYear }) => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgerA,
          fromFiscalYear,
          toFiscalYear,
          needCloseBudgets: true,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
          encumbrancesRollover: [
            {
              orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
              basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
            },
          ],
        }),
      );
    };

    const rolloverLedgerAToSecondFiscalYear = () => rolloverLedgerA({
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
    });

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDatesAfterFirstRollover = () => {
      return updateFiscalYearDates('first', FISCAL_YEAR_OFFSETS.FIRST - 1).then(() => updateFiscalYearDates('second', FISCAL_YEAR_OFFSETS.FIRST));
    };

    const createFundWithCurrentAndPlannedBudgets = ({
      fundKey,
      letter,
      ledger,
      currentFiscalYear,
      plannedFiscalYear,
      currentAllocation,
      plannedAllocation,
      transferToFund,
    }) => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fund${letter}_${getRandomPostfix()}`,
        ledgerId: ledger.id,
        ...(transferToFund ? { allocatedToIds: [transferToFund.id] } : {}),
      })
        .then((fundResponse) => {
          testData[fundKey] = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fundId: testData[fundKey].id,
            fiscalYearId: currentFiscalYear.id,
            allocated: currentAllocation,
          });
        })
        .then(() => Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fundId: testData[fundKey].id,
          fiscalYearId: plannedFiscalYear.id,
          allocated: plannedAllocation,
          budgetStatus: 'Planned',
        }));
    };

    const createFundCWithBudgets = () => createFundWithCurrentAndPlannedBudgets({
      fundKey: 'fundC',
      letter: 'C',
      ledger: testData.ledgerA,
      currentFiscalYear: testData.fiscalYears.second,
      plannedFiscalYear: testData.fiscalYears.third,
      currentAllocation: MONEY.FUND_C_CURRENT_ALLOCATION,
      plannedAllocation: MONEY.FUND_C_PLANNED_ALLOCATION,
    });

    const createLedgerB = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledgerB_${getRandomPostfix()}`,
        fiscalYearOneId: testData.fiscalYears.second.id,
      }).then((ledgerResponse) => {
        testData.ledgerB = ledgerResponse;
      });
    };

    const createFundDWithBudgets = () => createFundWithCurrentAndPlannedBudgets({
      fundKey: 'fundD',
      letter: 'D',
      ledger: testData.ledgerB,
      currentFiscalYear: testData.fiscalYears.second,
      plannedFiscalYear: testData.fiscalYears.third,
      currentAllocation: MONEY.FUND_D_CURRENT_ALLOCATION,
      plannedAllocation: MONEY.FUND_D_PLANNED_ALLOCATION,
      transferToFund: testData.fundC,
    });

    const transferFromFundDToFundC = () => {
      return Transactions.createBatchTransactionsViaApi([
        {
          transactionType: TRANSACTION_TYPES.TRANSFER,
          source: 'User',
          currency: 'USD',
          amount: MONEY.TRANSFER_D_TO_C,
          fromFundId: testData.fundD.id,
          toFundId: testData.fundC.id,
          fiscalYearId: testData.fiscalYears.second.id,
        },
      ]);
    };

    const payInvoice4InSecondFiscalYear = () => {
      const updatedInvoice4 = {
        ...testData.invoice4,
        fiscalYearId: testData.fiscalYears.second.id,
      };

      return Invoices.updateInvoiceViaApi(updatedInvoice4).then(() => {
        testData.invoice4 = updatedInvoice4;

        return Invoices.changeInvoiceStatusViaApi({
          invoice: testData.invoice4,
          status: INVOICE_STATUSES.PAID,
        });
      });
    };

    const rolloverLedgerAToThirdFiscalYear = () => rolloverLedgerA({
      fromFiscalYear: testData.fiscalYears.second,
      toFiscalYear: testData.fiscalYears.third,
    });

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewEditFiscalYear.gui,
          Permissions.uiFinanceViewLedger.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
          Ledgers.searchByName(testData.ledgerA.name);
        });
    };

    before(() => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });

      return createConsecutiveFiscalYears()
        .then(() => createLedgerA())
        .then(() => createFundAWithBudget())
        .then(() => increaseFundAAllocation())
        .then(() => createFundBWithBudget())
        .then(() => decreaseFundBAllocation())
        .then(() => createOrganization())
        .then(() => createOrder1WithLine())
        .then(() => payInvoicesForOrder1())
        .then(() => createOrder2WithLine())
        .then(() => createOpenInvoice4ForOrder2())
        .then(() => rolloverLedgerAToSecondFiscalYear())
        .then(() => shiftFiscalYearDatesAfterFirstRollover())
        .then(() => createFundCWithBudgets())
        .then(() => createLedgerB())
        .then(() => createFundDWithBudgets())
        .then(() => transferFromFundDToFundC())
        .then(() => payInvoice4InSecondFiscalYear())
        .then(() => rolloverLedgerAToThirdFiscalYear())
        .then(() => createUserAndLogin());
    });

    after(() => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C839102 Financial summary is correctly displayed on the Ledger an FY view for the selected fiscal year (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C839102', 'nonParallel'] },
      () => {
        const { fiscalYears, ledgerA, ledgerB, fundA, fundB, fundC, fundD, locale } = testData;
        const { first: fyFirst, second: fySecond, third: fyThird } = fiscalYears;

        const format = (value) => NumberTools.formatCurrency(value, locale);

        // Step 1: Verify Ledger A's details pane for the second fiscal year
        Ledgers.selectLedger(ledgerA.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: fySecond.code }],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(1300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(1300) },
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(50) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(1350) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(310) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(1345), available: format(1035) },
          },
          funds: [{ name: fundA.name }, { name: fundB.name }, { name: fundC.name }],
        });

        // Step 2: Check the options in the "Fiscal year" dropdown
        LedgerDetails.checkFiscalYearDropdownOptions({
          current: [fySecond.code],
          previous: [fyFirst.code],
        });

        // Step 3: Select the first fiscal year in the "Fiscal year" dropdown and verify details
        LedgerDetails.selectFiscalYear(fyFirst.code);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: fyFirst.code }],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(300) },
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(0) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(300) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(325) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(10) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(320) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(15) },
            ],
            balance: { cash: format(-15), available: format(-20) },
          },
          funds: [{ name: fundA.name }, { name: fundB.name }],
        });
        LedgerDetails.closeLedgerDetails();

        // Step 4: Search for the Ledger B  and verify Ledger B's details pane for the second fiscal year
        Ledgers.searchByName(ledgerB.name);
        Ledgers.selectLedger(ledgerB.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: fySecond.code }],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(1000) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(1000) },
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(-50) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(950) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(950), available: format(950) },
          },
          funds: [{ name: fundD.name }],
        });
        LedgerDetails.closeLedgerDetails();

        // Step:5 Change the dates of all three fiscal years so the third fiscal year period includes the current date
        FinanceHelper.selectFiscalYearsNavigation();

        const currentYear = new Date().getFullYear();

        [
          { fiscalYear: fyFirst, year: currentYear - 2 },
          { fiscalYear: fySecond, year: currentYear - 1 },
          { fiscalYear: fyThird, year: currentYear },
        ].forEach(({ fiscalYear, year }) => {
          FinanceHelper.searchByName(fiscalYear.name);
          FiscalYears.selectFY(fiscalYear.name);
          FiscalYears.editFiscalYearDetails();
          FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
            `01/01/${year}`,
            `12/31/${year}`,
          );
        });

        // Step 6: Navigate back to the Ledger A details pane and verify details for the third FY
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(ledgerA.name);
        Ledgers.selectLedger(ledgerA.name);
        LedgerDetails.selectFiscalYear(fyThird.code);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: fyThird.code }],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(800) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(1800) },
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(0) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(1800) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(1800), available: format(1485) },
          },
          funds: [{ name: fundA.name }, { name: fundB.name }, { name: fundC.name }],
        });

        // Step 7: Check the options in the "Fiscal year" dropdown
        LedgerDetails.checkFiscalYearDropdownOptions({
          current: [fyThird.code],
          previous: [fySecond.code, fyFirst.code],
        });
        LedgerDetails.closeLedgerDetails();

        // Step 8: Navigate to the Ledger B details pane and verify details for the third FY
        Ledgers.searchByName(ledgerB.name);
        Ledgers.selectLedger(ledgerB.name);
        LedgerDetails.closeLedgerDetails();
        Ledgers.selectLedger(ledgerB.name);
        LedgerDetails.selectFiscalYear(fyThird.code);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: fyThird.code }],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(500) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(500) },
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(0) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(500) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(500), available: format(500) },
          },
          funds: [{ name: fundD.name }],
        });

        // Step 9: Check the options in the "Fiscal year" dropdown
        LedgerDetails.checkFiscalYearDropdownOptions({
          current: [fyThird.code],
          previous: [fySecond.code],
        });

        // Step 10: Search for the first fiscal year and check its details pane
        FinanceHelper.selectFiscalYearsNavigation();
        FinanceHelper.searchByCode(fyFirst.code);
        FiscalYears.selectFY(fyFirst.name);
        FiscalYears.expectFY(fyFirst.name);
        FiscalYearDetails.checkFiscalYearDetails({
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(300) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(325) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(10) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(320) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(15) },
            ],
            balance: { cash: format(-15), available: format(-20) },
          },
          ledgers: [
            {
              name: ledgerA.name,
              allocated: format(300),
              unavailable: format(320),
              available: format(-20),
            },
            {
              name: ledgerB.name,
              allocated: format(0),
              unavailable: format(0),
              available: format(0),
            },
          ],
          groups: [],
          funds: [
            {
              name: fundA.name,
              allocated: format(150),
              unavailable: format(162.5),
              available: format(-12.5),
            },
            {
              name: fundB.name,
              allocated: format(150),
              unavailable: format(157.5),
              available: format(-7.5),
            },
          ],
        });

        // Step 11: Search for the second fiscal year and check its details pane
        FinanceHelper.searchByCode(fySecond.code);
        FiscalYears.selectFY(fySecond.name);
        FiscalYears.expectFY(fySecond.name);
        FiscalYearDetails.checkFiscalYearDetails({
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(2300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(2300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(2300) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(310) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(5) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(15) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(2295), available: format(1985) },
          },
          ledgers: [
            {
              name: ledgerA.name,
              allocated: format(1300),
              unavailable: format(315),
              available: format(1035),
            },
            {
              name: ledgerB.name,
              allocated: format(1000),
              unavailable: format(0),
              available: format(950),
            },
          ],
          groups: [],
          funds: [
            {
              name: fundA.name,
              allocated: format(150),
              unavailable: format(160),
              available: format(-10),
            },
            {
              name: fundB.name,
              allocated: format(150),
              unavailable: format(155),
              available: format(-5),
            },
            {
              name: fundC.name,
              allocated: format(1000),
              unavailable: format(0),
              available: format(1050),
            },
            {
              name: fundD.name,
              allocated: format(1000),
              unavailable: format(0),
              available: format(950),
            },
          ],
        });

        // Step 12: Search for the third fiscal year and check its details pane
        FinanceHelper.searchByCode(fyThird.code);
        FiscalYears.selectFY(fyThird.name);
        FiscalYears.expectFY(fyThird.name);
        FiscalYearDetails.checkFiscalYearDetails({
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(1300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(2300) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(2300) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(315) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(15) },
              { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
            ],
            balance: { cash: format(2300), available: format(1985) },
          },
          ledgers: [
            {
              name: ledgerA.name,
              allocated: format(1800),
              unavailable: format(315),
              available: format(1485),
            },
            {
              name: ledgerB.name,
              allocated: format(500),
              unavailable: format(0),
              available: format(500),
            },
          ],
          groups: [],
          funds: [
            {
              name: fundA.name,
              allocated: format(150),
              unavailable: format(160),
              available: format(-10),
            },
            {
              name: fundB.name,
              allocated: format(150),
              unavailable: format(155),
              available: format(-5),
            },
            {
              name: fundC.name,
              allocated: format(1500),
              unavailable: format(0),
              available: format(1500),
            },
            {
              name: fundD.name,
              allocated: format(500),
              unavailable: format(0),
              available: format(500),
            },
          ],
        });
      },
    );
  });
});
