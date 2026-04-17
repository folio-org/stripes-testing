import Budgets from '../../support/fragments/finance/budgets/budgets';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  TRANSACTION_TOOLTIPS,
} from '../../support/constants';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import { Transactions } from '../../support/fragments/finance';

describe('Invoices', () => {
  const code = CodeTools(4);
  const adjustment1Amount = 10;
  const adjustment2Amount = 25;
  const invoiceLineAmount = 50;
  const testData = {
    fiscalYear: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomFourDigitNumber()}`,
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    },
    ledger: {},
    fund: {},
    budget: {},
    expenseClass: {},
    organization: NewOrganization.getDefaultOrganization(),
    invoice: {},
    user: {},
    adjustments: {
      adjustment1: 'Adjustment1',
      adjustment2: 'Adjustment2',
    },
  };

  const createFinanceStructure = () => {
    return FiscalYears.createViaApi(testData.fiscalYear)
      .then((fiscalYearResponse) => {
        testData.fiscalYear = fiscalYearResponse;

        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: testData.fiscalYear.id,
        });
      })
      .then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: testData.ledger.id,
        });
      })
      .then((fundResponse) => {
        testData.fund = fundResponse.fund;

        return ExpenseClasses.createExpenseClassViaApi(ExpenseClasses.getDefaultExpenseClass());
      })
      .then((expenseClassResponse) => {
        testData.expenseClass = expenseClassResponse;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYear.id,
          fundId: testData.fund.id,
          allocated: 100,
          statusExpenseClasses: [
            {
              status: EXPENSE_CLASS_STATUSES.ACTIVE,
              expenseClassId: testData.expenseClass.id,
            },
          ],
        });
      })
      .then((budgetResponse) => {
        testData.budget = budgetResponse;
      });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const createInvoiceWithAdjustments = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        fiscalYearId: testData.fiscalYear.id,
        batchGroupId: batchGroup.id,
        accountingCode: testData.organization.erpCode,
        adjustments: [
          {
            description: testData.adjustments.adjustment1,
            value: adjustment1Amount,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
            fundDistributions: [
              {
                fundId: testData.fund.id,
                code: testData.fund.code,
                expenseClassId: testData.expenseClass.id,
                encumbrance: null,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          },
          {
            description: testData.adjustments.adjustment2,
            value: adjustment2Amount,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
            fundDistributions: [
              {
                fundId: testData.fund.id,
                code: testData.fund.code,
                expenseClassId: testData.expenseClass.id,
                encumbrance: null,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          },
        ],
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        const invoiceLine = Invoices.getDefaultInvoiceLine({
          invoiceId: invoiceResponse.id,
          invoiceLineStatus: invoiceResponse.status,
          subTotal: invoiceLineAmount,
          fundDistributions: [
            {
              fundId: testData.fund.id,
              expenseClassId: testData.expenseClass.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        });

        return Invoices.createInvoiceLineViaApi(invoiceLine);
      });
    });
  };

  const approveAndPayInvoice = () => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice: testData.invoice,
      status: INVOICE_STATUSES.PAID,
    });
  };

  before(() => {
    cy.getAdminToken();

    return createFinanceStructure()
      .then(() => createOrganization())
      .then(() => createInvoiceWithAdjustments())
      .then(() => approveAndPayInvoice())
      .then(() => {
        return cy.createTempUser([
          Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesCancelInvoices.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C710366 Cancelling a paid invoice with two invoice-level adjustments (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C710366'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: `$${invoiceLineAmount}.00` },
          {
            key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS,
            value: `$${adjustment1Amount + adjustment2Amount}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `$${invoiceLineAmount + adjustment1Amount + adjustment2Amount}.00`,
          },
        ],
        invoiceFundDistributions: [
          {
            adjustment: testData.adjustments.adjustment1,
            fund: `${testData.fund.name}(${testData.fund.code})`,
            expenseClass: testData.expenseClass.name,
            value: `${testData.invoice.adjustments[0].fundDistributions[0].value}%`,
            amount: `$${adjustment1Amount}.00`,
          },
          {
            adjustment: testData.adjustments.adjustment2,
            fund: `${testData.fund.name}(${testData.fund.code})`,
            expenseClass: testData.expenseClass.name,
            value: `${testData.invoice.adjustments[1].fundDistributions[0].value}%`,
            amount: `$${adjustment2Amount}.00`,
          },
        ],
        invoiceLevelAdjustments: [
          {
            description: testData.adjustments.adjustment1,
            value: `$${adjustment1Amount}.00`,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
          },
          {
            description: testData.adjustments.adjustment2,
            value: `$${adjustment2Amount}.00`,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
          },
        ],
      });
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      InvoiceView.selectFundInInvoiceLevelFundDistributionSection(
        `${testData.fund.name}(${testData.fund.code})`,
      );
      Funds.viewTransactionsForCurrentBudget();
      Transactions.waitLoading();
      [invoiceLineAmount, adjustment1Amount, adjustment2Amount].forEach((amount) => {
        Transactions.checkVoidedTransactionInList({
          amount: `$${amount}.00`,
          tooltipText: TRANSACTION_TOOLTIPS.VOIDED_TRANSACTION,
        });
      });
    },
  );
});
