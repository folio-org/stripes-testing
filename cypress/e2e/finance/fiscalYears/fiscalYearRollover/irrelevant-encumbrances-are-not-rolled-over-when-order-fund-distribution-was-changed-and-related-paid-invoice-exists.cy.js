import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXPORT_BUDGET_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
} from '../../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import { Invoices } from '../../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const code = CodeTools(4);
    const polTotalAmount = 50;
    const paidAmount = 30;
    const resultFileName = `${DateTools.getCurrentDateForFileNaming()}-result.csv`;
    const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      fundA: {},
      budgetA: {},
      fundB: {},
      budgetB: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      invoice: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = (fundKey, budgetKey) => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
        testData[fundKey] = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData[fundKey].id,
          allocated: 1000,
        }).then((budget) => {
          testData[budgetKey] = budget;
        });
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
        });
    };

    const createOrderWithLine = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      })
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: testData.acquisitionMethodId,
              purchaseOrderId: testData.order.id,
              title: `AT_C375266_OrderLine_${getRandomPostfix()}`,
              listUnitPrice: polTotalAmount,
              poLineEstimatedPrice: polTotalAmount,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
        })
        .then((orderLine) => {
          testData.orderLine = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createAndPayInvoice = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine.id)
        .then((orderLine) => {
          testData.orderLine = orderLine;

          return Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            fiscalYearId: testData.fiscalYears.first.id,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            exportToAccounting: true,
          });
        })
        .then((invoice) => {
          testData.invoice = invoice;

          return Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: testData.orderLine.id,
              fundDistributions: testData.orderLine.fundDistribution,
              accountingCode: testData.organization.erpCode,
              subTotal: paidAmount,
              releaseEncumbrance: true,
            }),
          );
        })
        .then(() => {
          return Invoices.changeInvoiceStatusViaApi({
            invoice: testData.invoice,
            status: INVOICE_STATUSES.PAID,
          });
        });
    };

    const changeFundInOrderLine = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        testData.orderLine = orderLine;

        return OrderLines.updateOrderLineViaApi({
          ...testData.orderLine,
          fundDistribution: [
            {
              code: testData.fundB.code,
              fundId: testData.fundB.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        });
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.uiOrdersEdit.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
          Ledgers.searchByName(testData.ledger.name);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(() => createFundWithBudget('fundA', 'budgetA'))
        .then(() => createFundWithBudget('fundB', 'budgetB'))
        .then(createOrganization)
        .then(getAcquisitionMethodId)
        .then(createOrderWithLine)
        .then(createAndPayInvoice)
        .then(changeFundInOrderLine)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${resultFileName}`);
      });
    });

    it(
      'C375266 Irrelevant encumbrances are not rolled over when order fund distribution was changed and related paid invoice exists (based on Expended) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C375266', 'nonParallel'] },
      () => {
        const rolloverFields = {
          fiscalYear: testData.fiscalYears.second.code,
          rolloverBudgets: [
            { checked: true, rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE },
          ],
          rolloverEncumbrance: {
            oneTime: { checked: true, basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.EXPENDED },
          },
        };
        // Step 1: Open ledger details pane
        Ledgers.selectLedger(testData.ledger.name);

        // Steps 2-3: Open rollover form and fill in rollover settings
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 4-6: Run test rollover
        LedgerRolloverDetails.clickTestRolloverButton();

        // Step 7: Check rollover logs
        Ledgers.rolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
          ],
        });

        // Step 8: Export test rollover result
        LedgerRollovers.exportRolloverResult();

        // Steps 9-10: Check "<mm_dd_yyyy>-result.csv" file content for both funds
        Ledgers.checkRolloverResultCsvContent({
          fileName: resultFileName,
          funds: [
            {
              name: testData.fundA.name,
              columns: { [EXPORT_BUDGET_FIELDS.BUDGET_ENCUMBERED]: 0 },
            },
            {
              name: testData.fundB.name,
              columns: { [EXPORT_BUDGET_FIELDS.BUDGET_ENCUMBERED]: paidAmount },
            },
          ],
        });

        // Steps 11-12: Open rollover form and fill in the same rollover settings
        Ledgers.closeOpenedPage();
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 13-15: Execute rollover
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Step 16: Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Step 17: Check "Fund A" planned budget
        LedgerDetails.openFundDetails(testData.fundA.name);
        FundDetails.checkFundDetails({
          plannedBudgets: [
            {
              name: `${testData.fundA.code}-${testData.fiscalYears.second.code}`,
              unavailable: '$0.00',
            },
          ],
        });

        // Steps 18-19: Check "Fund B" planned budget
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedgerAfterRollover(testData.ledger.name);
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
        LedgerDetails.openFundDetails(testData.fundB.name);
        FundDetails.checkFundDetails({
          plannedBudgets: [
            {
              name: `${testData.fundB.code}-${testData.fiscalYears.second.code}`,
              unavailable: `$${paidAmount}.00`,
            },
          ],
        });
      },
    );
  });
});
