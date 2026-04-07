import moment from 'moment';

import permissions from '../../../support/dictionary/permissions';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FINANCIAL_SUMMARY_FIELD_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES, ORDER_STATUSES,
} from '../../../support/constants';
import { LedgerRollovers } from '../../../support/fragments/finance';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYearDetails from '../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Invoices from '../../../support/fragments/invoices/invoices';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../../support/fragments/orders/newOrder';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import {
  ExecutionFlowManager,
  NumberTools,
} from '../../../support/utils';

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
      const ctx = flow.context;

      const initialFiscalYear = ctx.get(R.INITIAL_FISCAL_YEAR);
      const nextFiscalYear = ctx.get(R.NEXT_FISCAL_YEAR);
      const ledgerA = ctx.get(R.LEDGER_A);
      const ledgerB = ctx.get(R.LEDGER_B);
      const ledgerC = ctx.get(R.LEDGER_C);
      const groupA = ctx.get(R.GROUP_A);
      const groupB = ctx.get(R.GROUP_B);
      const fundA = ctx.get(R.FUND_A);
      const fundB = ctx.get(R.FUND_B);
      const fundC = ctx.get(R.FUND_C);
      const locale = ctx.get(R.LOCALE);

      const format = (value) => NumberTools.formatCurrency(value, locale);

      // Check Fiscal year #1 details
      FinanceHelper.searchByCode(initialFiscalYear.code);
      FinanceHelper.selectFirstFinance(initialFiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        financialSummary: {
          information: [
            // Funding information
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.INITIAL_ALLOCATION, value: format(2000) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.TOTAL_ALLOCATED, value: format(2000) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.TOTAL_FUNDING, value: format(2000) },

            // Financial activity & overages
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.ENCUMBERED, value: format(5) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.AWAITING_PAYMENT, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.EXPENDED, value: format(20) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.CREDITED, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.UNAVAILABLE, value: format(25) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.OVER_ENCUMBRANCE, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.OVER_EXPENDED, value: format(0) },
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
      FinanceHelper.selectFirstFinance(nextFiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        financialSummary: {
          information: [
            // Funding information
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.INITIAL_ALLOCATION, value: format(3000) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.TOTAL_ALLOCATED, value: format(3000) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.TOTAL_FUNDING, value: format(3000) },

            // Financial activity & overages
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.ENCUMBERED, value: format(5) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.AWAITING_PAYMENT, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.EXPENDED, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.CREDITED, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.UNAVAILABLE, value: format(5) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.OVER_ENCUMBRANCE, value: format(0) },
            { key: FINANCIAL_SUMMARY_FIELD_LABELS.OVER_EXPENDED, value: format(0) },
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
            available: format(0),
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
  const createActiveConsecutiveFiscalYears = (flowManager) => {
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
        .then((fiscalYear) => flowManager.set(fiscalYearKey, fiscalYear));
    });
  };

  const createActiveLedgersForInitialFiscalYear = (flow) => {
    const fiscalYearOneId = flow.ctx().get(R.INITIAL_FISCAL_YEAR).id;

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

  const createActiveFundsForWithGroups = (flowManager) => {
    const ctx = flowManager.context;
    const fiscalYearOneId = ctx.get(R.INITIAL_FISCAL_YEAR).id;

    const ledgerAId = ctx.get(R.LEDGER_A).id;
    const ledgerBId = ctx.get(R.LEDGER_B).id;

    const groupAId = ctx.get(R.GROUP_A).id;
    const groupBId = ctx.get(R.GROUP_B).id;

    [
      [ledgerAId, groupAId, R.FUND_A, R.BUDGET_A],
      [ledgerBId, groupBId, R.FUND_B, R.BUDGET_B],
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
        .then((fundData) => flowManager.set(fundKey, fundData))
        .then(({ context }) => (
          Budgets
            .createViaApi({
              ...Budgets.getDefaultBudget(),
              fundId: context.get(fundKey).fund.id,
              fiscalYearId: fiscalYearOneId,
              allocated: 1000,
            })
        ))
        .then((budget) => flowManager.set(budgetKey, budget));
    });
  };

  const createPurchaseOrderWithLine = (flowManager) => {
    flowManager
      .step(() => {
        NewOrganization
          .createViaApi(NewOrganization.getDefaultOrganization())
          .then((organization) => flowManager.set(R.VENDOR, organization));
      })
      .step((fm) => {
        Orders
          .createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: fm.context.get(R.VENDOR)?.id }),
            reEncumber: true,
          })
          .then((order) => fm.set(R.ORDER, order));
      })
      .step((fm) => {
        const fundDistribution = [R.FUND_A, R.FUND_B].map((fundKey) => ({
          fundId: fm.context.get(fundKey).fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 50,
        }));

        cy.getAcquisitionMethodsApi({ query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"` })
          .then(({ body }) => (
            OrderLines
              .createOrderLineViaApi(BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: body.acquisitionMethods[0].id,
                purchaseOrderId: fm.context.get(R.ORDER)?.id,
                listUnitPrice: 25,
                fundDistribution,
              }))
          ))
          .then((orderLine) => fm.set(R.ORDER_LINE, orderLine));
      })
      .step((fm) => {
        Orders
          .updateOrderViaApi({ ...fm.context.get(R.ORDER), workflowStatus: ORDER_STATUSES.OPEN })
          .then(({ body }) => fm.set(R.ORDER, body));
      });
  };

  const createPaidInvoiceWithInvoiceLines = (flowManager) => {
    const ctx = flowManager.context;

    flowManager
      .step(() => {
        Invoices
          .createInvoiceViaApi({
            vendorId: ctx.get(R.VENDOR)?.id,
            accountingCode: ctx.get(R.VENDOR)?.erpCode,
            fiscalYearId: ctx.get(R.INITIAL_FISCAL_YEAR)?.id,
            exportToAccounting: true,
          })
          .then((invoice) => flowManager.set(R.INVOICE, invoice));
      })
      .step((fm) => {
        Invoices
          .createInvoiceLineViaApi(Invoices.getDefaultInvoiceLine({
            invoiceId: fm.context.get(R.INVOICE)?.id,
            invoiceLineStatus: INVOICE_STATUSES.OPEN,
            poLineId: fm.context.get(R.ORDER_LINE)?.id,
            fundDistributions: fm.context.get(R.ORDER_LINE)?.fundDistribution,
            subTotal: 20,
            accountingCode: fm.context.get(R.VENDOR)?.erpCode,
            releaseEncumbrance: false,
          }));
      })
      .step((fm) => {
        Invoices
          .changeInvoiceStatusViaApi({
            invoice: fm.context.get(R.INVOICE),
            status: INVOICE_STATUSES.PAID,
          });
      });
  };

  const rolloverLedgers = (flowManager) => {
    const fromFiscalYear = flowManager.context.get(R.INITIAL_FISCAL_YEAR);
    const toFiscalYear = flowManager.context.get(R.NEXT_FISCAL_YEAR);

    [R.LEDGER_A, R.LEDGER_B].forEach((ledgerKey) => {
      LedgerRollovers.createLedgerRolloverViaApi(LedgerRollovers.generateLedgerRollover({
        ledger: flowManager.context.get(ledgerKey),
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
    const initialFiscalYear = flow.context.get(R.INITIAL_FISCAL_YEAR);
    const nextFiscalYear = flow.context.get(R.NEXT_FISCAL_YEAR);

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
        fiscalYearOneId: flow.context.get(R.NEXT_FISCAL_YEAR).id,
      })
      .then((ledger) => flow.set(R.LEDGER_C, ledger));
  };

  const createActiveFundsForLedgerC = (flow) => {
    Funds
      .createViaApi(
        { ...Funds.getDefaultFund(), ledgerId: flow.context.get(R.LEDGER_C).id },
        [flow.context.get(R.GROUP_A).id, flow.context.get(R.GROUP_B).id],
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

  const loginToHeFinanceApp = ({ context }) => {
    const userProperties = context.get(R.USER_PROPERTIES);

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
