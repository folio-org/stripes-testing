import moment from 'moment';

import { Permissions } from '../../../../support/dictionary';
import {
  FinanceHelper,
  FiscalYears,
  Funds,
  Budgets,
  Ledgers,
  LedgerRolloverInProgress,
} from '../../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../../../support/fragments/orders';
import { Invoices } from '../../../../support/fragments/invoices';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import { INVOICE_STATUSES } from '../../../../support/constants';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const today = moment().utc().format('MM/DD/YYYY');
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
    const funds = {
      first: {
        ...Funds.getDefaultFund(),
        ledgerId: ledger.id,
      },
      second: {
        ...Funds.getDefaultFund(),
        ledgerId: ledger.id,
      },
    };
    const budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.second.id,
      },
    };
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears,
      fileName: `${moment().utc().format('MM_DD_YYYY')}-result.csv`,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });
        Ledgers.createViaApi(ledger);
        Object.values(funds).forEach((fund) => {
          Funds.createViaApi(fund);
        });
        Object.values(budgets).forEach((budget) => {
          Budgets.createViaApi(budget);
        });

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 80,
            fundDistribution: [{ code: funds.first.code, fundId: funds.first.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` })
                .then((orderLines) => {
                  testData.orderLine = orderLines[0];

                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: testData.organization.id,
                    fiscalYearId: testData.fiscalYears.current.id,
                    poLineId: testData.orderLine.id,
                    fundDistributions: testData.orderLine.fundDistribution,
                    accountingCode: testData.organization.erpCode,
                    releaseEncumbrance: true,
                  }).then((invoice) => {
                    testData.invoice = invoice;

                    Invoices.changeInvoiceStatusViaApi({
                      invoice: testData.invoice,
                      status: INVOICE_STATUSES.PAID,
                    });
                  });
                })
                .then(() => {
                  OrderLines.getOrderLineViaApi({
                    query: `poLineNumber=="*${order.poNumber}*"`,
                  }).then((orderLines) => {
                    testData.orderLine = orderLines[0];

                    OrderLines.updateOrderLineViaApi({
                      ...testData.orderLine,
                      fundDistribution: [
                        {
                          code: funds.second.code,
                          fundId: funds.second.id,
                          value: 100,
                        },
                      ],
                    });
                  });
                });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersEdit.gui,
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
        FileManager.deleteFileFromDownloadsByMask(testData.fileName);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C375267 Encumbrances are rolled over correctly when order fund distribution was changed and related paid invoice exists (based on Remaining) (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet'] },
      () => {
        // Click on Ledger name link from preconditions
        FinanceHelper.searchByName(ledger.name);
        const LedgerDetails = Ledgers.selectLedger(ledger.name);
        LedgerDetails.checkLedgeDetails({
          information: [{ key: 'Current fiscal year', value: fiscalYears.current.code }],
        });

        // Click "Actions" button, Select "Rollover" option
        const LedgerRolloverDetails = LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.current.code });

        // Fill ledger rollover fields
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.next.code,
          rolloverBudgets: [{ checked: true }],
          rolloverEncumbrance: { oneTime: { checked: true, basedOn: 'Remaining' } },
        });

        // Click "Test rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickTestRolloverButton();

        // Click "Actions" button, Select "Rollover logs" option
        const LedgerRollovers = LedgerDetails.openLedgerRolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: 'Successful',
              errors: '-',
              results: `${today}-result`,
              settings: `${today}-settings`,
              source: 'Rollover test',
            },
          ],
        });

        // Click on the link in "Results" column
        LedgerRollovers.exportRolloverResult();

        // Open downloaded file, Check *"Encumbered (Budget)"* column
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((fund) => {
            cy.expect(fund['"Encumbered(Budget)"']).to.equal('0');
          });
        });

        // Go back to "Ledger name" pane, Click "Actions" button, Select "Rollover" option
        cy.visit(`${TopMenu.ledgerPath}/${ledger.id}/view`);

        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.current.code });

        // Fill ledger rollover fields
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.next.code,
          rolloverBudgets: [{ checked: true }],
          rolloverEncumbrance: { oneTime: { checked: true, basedOn: 'Remaining' } },
        });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
        LedgerDetails.checkLedgeDetails({
          information: [{ key: 'Current fiscal year', value: fiscalYears.current.code }],
        });

        // Click **"Fund A"** record in "Fund" accordion on
        const FundDetails = LedgerDetails.openFundDetails({ row: 0 });
        FundDetails.checkFundDetails({
          plannedBudgets: [{ unavailable: '$0.00' }],
        });

        // Go back to "Ledger name" pane
        cy.visit(`${TopMenu.ledgerPath}/${ledger.id}/view`);
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Click **"Fund B"** record in "Fund" accordion
        LedgerDetails.openFundDetails({ row: 1 });
        FundDetails.checkFundDetails({
          plannedBudgets: [{ unavailable: '$0.00' }],
        });
      },
    );
  });
});
