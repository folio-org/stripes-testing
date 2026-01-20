import { Permissions } from '../../../../support/dictionary';
import {
  FinanceHelper,
  FiscalYears,
  Funds,
  Budgets,
  Ledgers,
  LedgerRolloverInProgress,
  Transactions,
  TransactionDetails,
} from '../../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../../../support/fragments/orders';
import { Invoices } from '../../../../support/fragments/invoices';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import { INVOICE_STATUSES } from '../../../../support/constants';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const date = new Date();
    const code = CodeTools(4);
    const fiscalYears = {
      current: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}03`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id };
    const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const budget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYears.current.id,
      fundId: fund.id,
    };
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });
        Ledgers.createViaApi(ledger);
        Funds.createViaApi(fund);
        Budgets.createViaApi(budget);

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 20,
            fundDistribution: [
              { code: fund.code, fundId: fund.id, value: 20, distributionType: 'amount' },
            ],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });

              OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
                (orderLines) => {
                  testData.orderLine = orderLines[0];

                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: testData.organization.id,
                    fiscalYearId: testData.fiscalYears.current.id,
                    poLineId: testData.orderLine.id,
                    fundDistributions: testData.orderLine.fundDistribution,
                    accountingCode: testData.organization.erpCode,
                    releaseEncumbrance: true,
                    subTotal: 20,
                  }).then((invoice) => {
                    testData.invoice = invoice;

                    Invoices.changeInvoiceStatusViaApi({
                      invoice: testData.invoice,
                      status: INVOICE_STATUSES.PAID,
                    });
                  });
                },
              );
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C400643 Rollover based on "Remaining" when order has related paid invoice (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C400643'] },
      () => {
        // Click on Ledger name link from preconditions
        FinanceHelper.searchByName(ledger.name);
        const LedgerDetails = Ledgers.selectLedger(ledger.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Current fiscal year', value: fiscalYears.current.code }],
        });

        // Click "Actions" button, Select "Rollover" option
        const LedgerRolloverDetails = LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.current.code });

        // Fill ledger rollover fields
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.next.code,
          rolloverBudgets: [{ checked: true }],
          rolloverEncumbrance: {
            ongoing: { checked: true, basedOn: 'Remaining' },
            ongoingSubscription: { checked: true, basedOn: 'Remaining' },
            oneTime: { checked: true, basedOn: 'Remaining' },
          },
        });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Current fiscal year', value: fiscalYears.current.code }],
        });

        // Click **"Fund A"** record in "Fund" accordion on
        const FundDetails = LedgerDetails.openFundDetails(fund.name);

        // Click budget record in "Planned budget" accordion
        const BudgetDetails = FundDetails.openPlannedBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          information: [{ key: 'Name', value: fiscalYears.next.code }],
        });

        // Click "View transactions" link in "Budget information" accordion
        BudgetDetails.clickViewTransactionsLink();

        // Search for "Encumbrance" transaction and click on its "Transaction date" link
        Transactions.selectTransaction('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.next.code },
            { key: 'Amount', value: '0.00' },
            { key: 'Source', value: testData.order.poNumber },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: fund.name },
            { key: 'Initial encumbrance', value: '0.00' },
            { key: 'Awaiting payment', value: '0.00' },
            { key: 'Expended', value: '0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
      },
    );
  });
});
