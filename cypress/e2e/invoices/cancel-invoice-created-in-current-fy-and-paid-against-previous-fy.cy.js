import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Budgets, FiscalYears, LedgerRollovers } from '../../support/fragments/finance';
import { Invoices, InvoiceView, InvoiceLineDetails } from '../../support/fragments/invoices';
import { Transactions } from '../../support/fragments/finance/transactions';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import { NewOrder, Orders, OrderLines } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { StringTools, CodeTools, DateTools } from '../../support/utils';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const date = new Date();
  const code = CodeTools(4);
  const fiscalYears = {
    first: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      periodStart: DateTools.getCurrentDateForFiscalYear(),
      periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
    },
    second: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      periodStart: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(3),
      periodEnd: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(5),
    },
    third: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}03`,
      periodStart: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(7),
      periodEnd: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(9),
    },
  };
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }), reEncumber: true },
    rollover: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        FiscalYears.createViaApi(fiscalYears.second);
        FiscalYears.createViaApi(fiscalYears.third);

        const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          fiscalYear: fiscalYears.first,
          ledger: { restrictExpenditures: true },
          budget: { allocated: 100 },
        });

        testData.ledger = ledger;
        testData.fund = fund;
        testData.budget = budget;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 100,
            fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            },
          );
        });
      })
      .then(() => {
        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: fiscalYears.first,
          toFiscalYear: fiscalYears.second,
          needCloseBudgets: false,
        });
        LedgerRollovers.createLedgerRolloverViaApi(rollover);
      })
      .then(() => {
        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.first,
          _version: 1,
          periodStart: new Date(date.getFullYear() - 1, 0, 1),
          periodEnd: new Date(date.getFullYear() - 1, 11, 31),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.second,
          _version: 1,
          periodStart: DateTools.getCurrentDateForFiscalYear(),
          periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
        });
      })
      .then(() => {
        OrderLines.getOrderLineViaApi({
          query: `poLineNumber=="*${testData.order.poNumber}*"`,
        }).then((orderLines) => {
          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: fiscalYears.first.id,
            poLineId: orderLines[0].id,
            fundDistributions: orderLines[0].fundDistribution,
            accountingCode: testData.organization.erpCode,
          }).then((invoice) => {
            testData.invoice = invoice;

            Invoices.approveInvoiceViaApi({ invoice: testData.invoice });
          });
        });
      })
      .then(() => {
        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: fiscalYears.second,
          toFiscalYear: fiscalYears.third,
          needCloseBudgets: false,
        });
        LedgerRollovers.createLedgerRolloverViaApi(rollover);
      })
      .then(() => {
        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.second,
          _version: 2,
          periodStart: new Date(date.getFullYear(), 0, 1),
          periodEnd: DateTools.getPreviousDayDateForFiscalYear(),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.third,
          _version: 1,
          periodStart: DateTools.getCurrentDateForFiscalYear(),
          periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
        });
      })
      .then(() => {
        Invoices.getInvoiceViaApi({
          query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
        }).then(({ invoices }) => {
          Invoices.updateInvoiceViaApi({ ...invoices[0], status: INVOICE_STATUSES.PAID });
        });
      });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesCancelInvoices.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C388563 Cancel invoice created in current FY and paid against previous FY (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // Click "Vendor invoice number" link for Invoice from Preconditions
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // * "Status" field is "Open"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Click "Actions" button, Select "Cancel" option, Click "Submit" button
      InvoiceView.cancelInvoice();

      // * Invoice status is changed to "Cancelled"
      // * "Receipt status" and "Payment status" in "Invoice lines" accordion are specified as "Ongoing"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
        invoiceLines: [
          {
            poNumber: testData.order.poNumber,
            receiptStatus: 'Ongoing',
            paymentStatus: 'Ongoing',
          },
        ],
      });

      // Click on invoice line record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine();

      // * "Current encumbrance" field in "Fund distribution" accordion contains a link with "0.00" value
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          encumbrance: '0.00',
        },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '0.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '100.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      // Click on "Payment" transaction link
      Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.fund.name },
        ],
      });
    },
  );
});
