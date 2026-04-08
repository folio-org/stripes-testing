import moment from 'moment';

import permissions from '../../../support/dictionary/permissions';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  FUNDING_INFORMATION_NAMES,
  INVOICE_STATUSES, ORDER_STATUSES,
} from '../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYearDetails,
  FiscalYears,
  Funds,
  Groups,
  LedgerRollovers,
  Ledgers,
} from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  Orders,
  OrderLines,
} from '../../../support/fragments/orders';
import { NewOrganization } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import {
  DateTools,
  ExecutionFlowManager,
  NumberTools,
} from '../../../support/utils';
import getRandomStringCode from '../../../support/utils/generateTextCode';

/* Resource keys */
const R = {
  INITIAL_FISCAL_YEAR: 'initialFiscalYear',
  NEXT_FISCAL_YEAR: 'nextFiscalYear',
  LEDGER_A: 'ledgerA',
  LEDGER_B: 'ledgerB',
  LEDGER_C: 'ledgerC',
  GROUP_A: 'groupA',
  GROUP_B: 'groupB',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  FUND_C: 'fundC',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  BUDGET_C: 'budgetC',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  INVOICE: 'invoice',
  VENDOR: 'vendor',
  USER_PROPERTIES: 'userProperties',
  LOCALE: 'locale',
};

describe('Finance | Fiscal Year', () => {
  const flow = new ExecutionFlowManager();

  before('Create fiscal years, ledgers, groups, funds, order, invoice and rollover', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createActiveConsecutiveFiscalYears) // Precondition #1
      .step(steps.createActiveLedgersForInitialFiscalYear) // Precondition #2
      .step(steps.createActiveGroups) // Precondition #3
      .step(steps.createActiveFundsForWithGroups) // Precondition #4-5
      .step(steps.createPurchaseOrderWithLine) // Precondition #6
      .step(steps.createPaidInvoiceWithInvoiceLines) // Precondition #7
      .step(steps.rolloverLedgers) // Precondition #8
      .step(steps.updateFiscalYearDates) // Precondition #9
      .step(steps.createLedgerForNextFiscalYear) // Precondition #10
      .step(steps.createActiveFundsForLedgerC) // Precondition #11
      .step(steps.createTestUser) // Precondition #12
      .step(steps.loginToHeFinanceApp); // Precondition #13
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1030041 Verify that correct data is displayed for two consecutive fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1030041'] },
    () => {
      const {
        initialFiscalYear,
        nextFiscalYear,
        ledgerA,
        ledgerB,
        ledgerC,
        groupA,
        groupB,
        fundA,
        fundB,
        fundC,
        locale,
      } = flow.ctx();

      const format = (value) => NumberTools.formatCurrency(value, locale);

      // Check Fiscal year #1 details
      FinanceHelper.searchByCode(initialFiscalYear.code);
      FiscalYears.selectFY(initialFiscalYear.name);
      FiscalYears.expectFY(initialFiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        financialSummary: {
          information: [
            // Funding information
            { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(2000) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(2000) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(2000) },

            // Financial activity & overages
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(5) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(20) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(25) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
          ],
          balance: { cash: format(1980), available: format(1975) },
        },
        ledgers: [
          {
            name: ledgerA.name,
            code: ledgerA.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
          {
            name: ledgerB.name,
            code: ledgerB.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
          {
            name: ledgerC.name,
            code: ledgerC.code,
            allocated: format(0),
            unavailable: format(0),
            available: format(0),
          },
        ],
        groups: [
          {
            name: groupA.name,
            code: groupA.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
          {
            name: groupB.name,
            code: groupB.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
        ],
        funds: [
          {
            name: fundA.name,
            code: fundA.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
          {
            name: fundB.name,
            code: fundB.code,
            allocated: format(1000),
            unavailable: format(12.5),
            available: format(987.5),
          },
        ],
      });

      // Check Fiscal year #2 details
      FinanceHelper.searchByCode(nextFiscalYear.code);
      FiscalYears.selectFY(nextFiscalYear.name);
      FiscalYears.expectFY(nextFiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        financialSummary: {
          information: [
            // Funding information
            { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(3000) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(3000) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(3000) },

            // Financial activity & overages
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(5) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.CREDITED, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(5) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
          ],
          balance: { cash: format(3000), available: format(2995) },
        },
        ledgers: [
          {
            name: ledgerA.name,
            code: ledgerA.code,
            allocated: format(1000),
            unavailable: format(2.5),
            available: format(997.5),
          },
          {
            name: ledgerB.name,
            code: ledgerB.code,
            allocated: format(1000),
            unavailable: format(2.5),
            available: format(997.5),
          },
          {
            name: ledgerC.name,
            code: ledgerC.code,
            allocated: format(1000),
            unavailable: format(0),
            available: format(1000),
          },
        ],
        groups: [
          {
            name: groupA.name,
            code: groupA.code,
            allocated: format(2000),
            unavailable: format(2.5),
            available: format(1997.5),
          },
          {
            name: groupB.name,
            code: groupB.code,
            allocated: format(2000),
            unavailable: format(2.5),
            available: format(1997.5),
          },
        ],
        funds: [
          {
            name: fundA.name,
            code: fundA.code,
            allocated: format(1000),
            unavailable: format(2.5),
            available: format(997.5),
          },
          {
            name: fundB.name,
            code: fundB.code,
            allocated: format(1000),
            unavailable: format(2.5),
            available: format(997.5),
          },
          {
            name: fundC.name,
            code: fundC.code,
            allocated: format(1000),
            unavailable: format(0),
            available: format(1000),
          },
        ],
      });
    },
  );
});

// --- API calls and support functions ---
function getPreconditionSteps() {
  const createActiveConsecutiveFiscalYears = (flow) => {
    const defaultRolloverFiscalYear = FiscalYears.defaultRolloverFiscalYear;
    const series = getRandomStringCode(4);

    [R.INITIAL_FISCAL_YEAR, R.NEXT_FISCAL_YEAR].forEach((fiscalYearKey, index) => {
      const periods = DateTools.getFullFiscalYearStartAndEnd(index);

      FiscalYears
        .createViaApi({
          ...defaultRolloverFiscalYear,
          ...periods,
          series,
          code: `${series}${new Date(periods.periodStart).getFullYear()}`,
        })
        .then((fiscalYear) => flow.set(fiscalYearKey, fiscalYear));
    });
  };

  const createActiveLedgersForInitialFiscalYear = (flow) => {
    const fiscalYearOneId = flow.get(R.INITIAL_FISCAL_YEAR).id;

    [R.LEDGER_A, R.LEDGER_B].forEach((ledgerKey, index) => {
      const { name, ...base } = Ledgers.getDefaultLedger();

      Ledgers
        .createViaApi({
          ...base,
          name: `[${index}]_${name}`,
          fiscalYearOneId,
        })
        .then((ledger) => flow.set(ledgerKey, ledger));
    });
  };

  const createActiveGroups = (flowManager) => {
    [R.GROUP_A, R.GROUP_B].forEach((groupKey, index) => {
      const { name, ...base } = Groups.getDefaultGroup();

      Groups
        .createViaApi({ ...base, name: `[${index}]_${name}` })
        .then((group) => flowManager.set(groupKey, group));
    });
  };

  const createActiveFundsForWithGroups = (flow) => {
    const {
      initialFiscalYear,
      ledgerA,
      ledgerB,
      groupA,
      groupB,
    } = flow.ctx();

    [
      [ledgerA.id, groupA.id, R.FUND_A, R.BUDGET_A],
      [ledgerB.id, groupB.id, R.FUND_B, R.BUDGET_B],
    ].forEach(([ledgerId, groupId, fundKey, budgetKey], index) => {
      const { name, ...base } = Funds.getDefaultFund();

      Funds
        .createViaApi(
          {
            ...base,
            name: `[${index}]_${name}`,
            ledgerId,
          },
          [groupId],
        )
        .then((fundData) => flow.set(fundKey, fundData))
        .then(({ context }) => (
          Budgets
            .createViaApi({
              ...Budgets.getDefaultBudget(),
              fundId: context.get(fundKey).fund.id,
              fiscalYearId: initialFiscalYear.id,
              allocated: 1000,
            })
        ))
        .then((budget) => flow.set(budgetKey, budget));
    });
  };

  const createPurchaseOrderWithLine = (flow) => {
    flow
      .step(({ context }) => {
        NewOrganization
          .createViaApi(NewOrganization.getDefaultOrganization())
          .then((organization) => context.set(R.VENDOR, organization));
      })
      .step(({ context }) => {
        Orders
          .createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: context.get(R.VENDOR)?.id }),
            reEncumber: true,
          })
          .then((order) => context.set(R.ORDER, order));
      })
      .step(({ context }) => {
        const fundDistribution = [R.FUND_A, R.FUND_B].map((fundKey) => ({
          fundId: context.get(fundKey).fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 50,
        }));

        cy.getAcquisitionMethodsApi({ query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"` })
          .then(({ body }) => (
            OrderLines
              .createOrderLineViaApi(BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: body.acquisitionMethods[0].id,
                purchaseOrderId: context.get(R.ORDER)?.id,
                listUnitPrice: 25,
                fundDistribution,
              }))
          ))
          .then((orderLine) => context.set(R.ORDER_LINE, orderLine));
      })
      .step(({ context }) => {
        Orders
          .updateOrderViaApi({ ...context.get(R.ORDER), workflowStatus: ORDER_STATUSES.OPEN })
          .then(({ body }) => context.set(R.ORDER, body));
      });
  };

  const createPaidInvoiceWithInvoiceLines = (flow) => {
    flow
      .step(({ context }) => {
        Invoices
          .createInvoiceViaApi({
            vendorId: context.get(R.VENDOR)?.id,
            accountingCode: context.get(R.VENDOR)?.erpCode,
            fiscalYearId: context.get(R.INITIAL_FISCAL_YEAR)?.id,
            exportToAccounting: true,
          })
          .then((invoice) => context.set(R.INVOICE, invoice));
      })
      .step(({ context }) => {
        Invoices
          .createInvoiceLineViaApi(Invoices.getDefaultInvoiceLine({
            invoiceId: context.get(R.INVOICE)?.id,
            invoiceLineStatus: INVOICE_STATUSES.OPEN,
            poLineId: context.get(R.ORDER_LINE)?.id,
            fundDistributions: context.get(R.ORDER_LINE)?.fundDistribution,
            subTotal: 20,
            accountingCode: context.get(R.VENDOR)?.erpCode,
            releaseEncumbrance: false,
          }));
      })
      .step(({ context }) => {
        Invoices
          .changeInvoiceStatusViaApi({
            invoice: context.get(R.INVOICE),
            status: INVOICE_STATUSES.PAID,
          });
      });
  };

  const rolloverLedgers = (flow) => {
    const fromFiscalYear = flow.get(R.INITIAL_FISCAL_YEAR);
    const toFiscalYear = flow.get(R.NEXT_FISCAL_YEAR);

    [R.LEDGER_A, R.LEDGER_B].forEach((ledgerKey) => {
      LedgerRollovers.createLedgerRolloverViaApi(LedgerRollovers.generateLedgerRollover({
        ledger: flow.get(ledgerKey),
        fromFiscalYear,
        toFiscalYear,
        encumbrancesRollover: [
          {
            orderType: 'One-time',
            basedOn: 'Remaining'
          }
        ],
      }));
    });
  };

  const updateFiscalYearDates = (flow) => {
    const initialFiscalYear = flow.get(R.INITIAL_FISCAL_YEAR);
    const nextFiscalYear = flow.get(R.NEXT_FISCAL_YEAR);

    FiscalYears.updateFiscalYearViaApi({
      ...initialFiscalYear,
      periodEnd: moment().subtract(1, 'days').toISOString(),
    });

    FiscalYears.updateFiscalYearViaApi({
      ...nextFiscalYear,
      periodStart: moment().toISOString(),
    });
  };

  const createLedgerForNextFiscalYear = (flow) => {
    Ledgers
      .createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: flow.get(R.NEXT_FISCAL_YEAR).id,
      })
      .then((ledger) => flow.set(R.LEDGER_C, ledger));
  };

  const createActiveFundsForLedgerC = (flow) => {
    Funds
      .createViaApi(
        { ...Funds.getDefaultFund(), ledgerId: flow.get(R.LEDGER_C).id },
        [flow.get(R.GROUP_A).id, flow.get(R.GROUP_B).id],
      )
      .then((fundData) => flow.set(R.FUND_C, fundData))
      .then(({ context }) => (
        Budgets
          .createViaApi({
            ...Budgets.getDefaultBudget(),
            fundId: context.get(R.FUND_C).fund.id,
            fiscalYearId: context.get(R.NEXT_FISCAL_YEAR).id,
            allocated: 1000,
          })
      ))
      .then((budget) => flow.set(R.BUDGET_C, budget));
  };

  const createTestUser = (flow) => {
    cy.createTempUser([permissions.uiFinanceViewFiscalYear.gui])
      .then((userProperties) => flow.set(
        R.USER_PROPERTIES,
        userProperties,
        () => Users.deleteViaApi(userProperties.userId),
      ));
  };

  const loginToHeFinanceApp = (flow) => {
    const userProperties = flow.get(R.USER_PROPERTIES);

    cy.login(userProperties.username, userProperties.password, {
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitLoading,
    });
  };

  return {
    createActiveConsecutiveFiscalYears,
    createActiveLedgersForInitialFiscalYear,
    createActiveGroups,
    createActiveFundsForWithGroups,
    createPurchaseOrderWithLine,
    createPaidInvoiceWithInvoiceLines,
    rolloverLedgers,
    updateFiscalYearDates,
    createLedgerForNextFiscalYear,
    createActiveFundsForLedgerC,
    createTestUser,
    loginToHeFinanceApp,
  };
}
