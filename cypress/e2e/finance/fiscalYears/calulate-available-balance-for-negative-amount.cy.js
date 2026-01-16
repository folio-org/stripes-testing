import { INVOICE_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Fiscal years', () => {
    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: fiscalYear.id,
      restrictExpenditures: false,
      restrictEncumbrance: false,
    };
    const funds = {
      first: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_001.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
      second: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_002.${new Date().getTime()}`,
        ledgerId: ledger.id,
      },
    };
    const budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYear.id,
        fundId: funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 0,
        fiscalYearId: fiscalYear.id,
        fundId: funds.second.id,
      },
    };
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FiscalYears.createViaApi(fiscalYear);
        Ledgers.createViaApi(ledger);
        Object.values(funds).forEach((fund) => {
          Funds.createViaApi(fund);
        });
        Object.values(budgets).forEach((budget) => {
          Budgets.createViaApi(budget);
        });

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 100,
            fundDistribution: [{ code: funds.second.code, fundId: funds.second.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
                (orderLines) => {
                  testData.orderLine = orderLines[0];
                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: testData.organization.id,
                    fiscalYearId: testData.fiscalYear.id,
                    poLineId: testData.orderLine.id,
                    fundDistributions: testData.orderLine.fundDistribution,
                    accountingCode: testData.organization.erpCode,
                    subTotal: 10,
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
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C375283 Available balance at the fiscal year level is calculated correctly if one of the related fund has negative amount (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375283'] },
      () => {
        // Click on "Fiscal year #1" link on "Fiscal year" pane
        FinanceHelper.searchByName(fiscalYear.name);
        const FiscalYearDetails = FiscalYears.selectFisacalYear(fiscalYear.name);

        // #2 Check "Financial summary" accordion
        FiscalYearDetails.checkFinancialSummary({
          information: [
            { key: 'Expended', value: '$10.00' },
            { key: 'Unavailable', value: '$10.00' },
            { key: 'Over expended', value: '$10.00' },
          ],
          balance: { available: '$90.00' },
        });

        // Check Funds records in "Fund" accordion
        FiscalYearDetails.checkFundsDetails([
          {
            name: funds.first.name,
            code: funds.first.code,
            allocated: '$100.00',
            unavailable: '$0.00',
            available: '$100.00',
          },
          {
            name: funds.second.name,
            code: funds.second.code,
            allocated: '$0.00',
            unavailable: '$10.00',
            available: '($10.00)',
          },
        ]);
      },
    );
  });
});
