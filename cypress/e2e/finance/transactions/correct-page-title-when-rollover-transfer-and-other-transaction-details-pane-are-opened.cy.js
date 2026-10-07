import {
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  TRANSACTION_TYPES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  FundDetails,
  Funds,
  LedgerRollovers,
  Ledgers,
  TransactionDetails,
  Transactions,
  Transfers,
} from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../../support/utils';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import { formatCurrency } from '../../../support/utils/numberTools';

const FINANCE_FOLIO_TITLE = 'Finance - FOLIO';
const BUDGET_ALLOCATED_AMOUNT = 1000;
const POL_UNIT_PRICE = 10;
const INVOICE_SUBTOTAL = 10;
const CREDIT_INVOICE_SUBTOTAL = -5;
const ALLOCATION_INCREASE_AMOUNT = 100;
const TRANSFER_AMOUNT = 50;
const ROLLOVER_ADJUST_ALLOCATION_PERCENT = 10;

describe('Finance', () => {
  describe('Transactions', () => {
    const flow = new ExecutionFlowManager();
    const date = new Date();
    const R = {
      ORG: 'org',
      FY_CURRENT: 'fyCurrent',
      FY_NEXT: 'fyNext',
      LEDGER: 'ledger',
      LOCALE: 'locale',
      FUND_A: 'fundA',
      FUND_B: 'fundB',
      BUDGET_A: 'budgetA',
      BUDGET_B: 'budgetB',
      ORDER: 'order',
      INVOICE_1: 'invoice1',
      INVOICE_2: 'invoice2',
      INVOICE_3: 'invoice3',
      USER: 'user',
    };

    before('Create C451615 preconditions', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

      flow
        .step((f) => {
          // Precondition: Organization for orders and invoices
          return Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization(), {
            returnBody: true,
          }).then((org) => f.set(R.ORG, org, (v) => Organizations.deleteOrganizationViaApi(v.id)));
        })
        // Precondition 1: Fiscal year includes the current date and consecutive one
        .step((f) => {
          const series = getRandomStringCode(4);

          [R.FY_CURRENT, R.FY_NEXT].forEach((fiscalYearKey, index) => {
            const periods = DateTools.getFullFiscalYearStartAndEnd(index);

            FiscalYears.createViaApi({
              ...FiscalYears.getDefaultFiscalYear(),
              ...periods,
              series,
              code: `${series}${new Date(periods.periodStart).getFullYear()}`,
            }).then((fiscalYear) => f.set(fiscalYearKey, fiscalYear, (v) => FiscalYears.deleteFiscalYearViaApi(v.id, false)));
          });
        })
        .step((f) => {
          // Precondition 2: Ledger related to the first fiscal year
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FY_CURRENT).id,
          }).then((ledger) => f.set(R.LEDGER, ledger, (v) => Ledgers.deleteLedgerViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Active Fund A related to the ledger with current budget
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
          }).then((response) => f.set(R.FUND_A, response.fund, (v) => Funds.deleteFundViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Active Fund B related to the ledger with current budget
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
          }).then((response) => f.set(R.FUND_B, response.fund, (v) => Funds.deleteFundViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Budget for Fund A in the first fiscal year with money allocation
          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: BUDGET_ALLOCATED_AMOUNT,
            fiscalYearId: f.get(R.FY_CURRENT).id,
            fundId: f.get(R.FUND_A).id,
          }).then((budget) => f.set(R.BUDGET_A, budget, (v) => Budgets.deleteViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Budget for Fund B in the first fiscal year with money allocation
          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: BUDGET_ALLOCATED_AMOUNT,
            fiscalYearId: f.get(R.FY_CURRENT).id,
            fundId: f.get(R.FUND_B).id,
          }).then((budget) => f.set(R.BUDGET_B, budget, (v) => Budgets.deleteViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 4: Rollover with Transfer type, Available value, 10% allocation adjustment
          return LedgerRollovers.createLedgerRolloverViaApi(
            LedgerRollovers.generateLedgerRollover({
              ledger: f.get(R.LEDGER),
              fromFiscalYear: f.get(R.FY_CURRENT),
              toFiscalYear: f.get(R.FY_NEXT),
              budgetsRollover: [
                {
                  addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
                  rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.AVAILABLE,
                  rolloverAllocation: true,
                  adjustAllocation: ROLLOVER_ADJUST_ALLOCATION_PERCENT,
                },
              ],
              encumbrancesRollover: [],
              needCloseBudgets: true,
            }),
          );
        })
        .step((f) => {
          // Precondition 5: Update first fiscal year dates to the past
          return FiscalYears.updateFiscalYearViaApi({
            ...f.get(R.FY_CURRENT),
            _version: 1,
            periodStart: new Date(date.getFullYear() - 1, 0, 1),
            periodEnd: new Date(date.getFullYear() - 1, 11, 31),
          });
        })
        .step((f) => {
          // Precondition 5: Update second fiscal year dates to include the current date
          return FiscalYears.updateFiscalYearViaApi({
            ...f.get(R.FY_NEXT),
            _version: 1,
            periodStart: new Date(date.getFullYear(), 0, 1),
            periodEnd: new Date(date.getFullYear(), 11, 31),
          });
        })
        .step((f) => {
          // Precondition 6: Increase allocation for Fund A in the second fiscal year
          return Transactions.createAllocationViaApi({
            fiscalYearId: f.get(R.FY_NEXT).id,
            amount: ALLOCATION_INCREASE_AMOUNT,
            toFundId: f.get(R.FUND_A).id,
          });
        })
        .step((f) => {
          // Precondition 7: Transfer money from Fund B to Fund A in the second fiscal year
          return Transfers.createTransferViaApi(
            Transfers.getDefaultTransfer({
              amount: TRANSFER_AMOUNT,
              toFundId: f.get(R.FUND_A).id,
              fromFundId: f.get(R.FUND_B).id,
              fiscalYearId: f.get(R.FY_NEXT).id,
            }),
          );
        })
        .step((f) => {
          // Precondition 8: One-time order in Open status with PO line for Fund A
          return Orders.createOrderViaApi(
            NewOrder.getDefaultOrder({ vendorId: f.get(R.ORG).id }),
          ).then((order) => f.set(R.ORDER, order, (v) => Orders.deleteOrderViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 8: PO line with Fund A distribution
          return cy.getAcquisitionMethodsApi().then(({ body }) => {
            return OrderLines.createOrderLineViaApi(
              BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: f.get(R.ORDER).id,
                acquisitionMethod: body.acquisitionMethods[0].id,
                fundDistribution: [
                  {
                    code: f.get(R.FUND_A).code,
                    fundId: f.get(R.FUND_A).id,
                    distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                    value: 100,
                  },
                ],
                listUnitPrice: POL_UNIT_PRICE,
                poLineEstimatedPrice: POL_UNIT_PRICE,
              }),
            );
          });
        })
        .step((f) => {
          // Precondition 8: Open the order to create the encumbrance transaction
          return Orders.updateOrderViaApi({
            ...f.get(R.ORDER),
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        })
        .step((f) => {
          // Precondition 9: Invoice #1 created with Fund A distribution
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: f.get(R.ORG).id,
            fiscalYearId: f.get(R.FY_NEXT).id,
            accountingCode: f.get(R.ORG).erpCode,
            fundDistributions: [
              {
                code: f.get(R.FUND_A).code,
                fundId: f.get(R.FUND_A).id,
                value: 100,
              },
            ],
            subTotal: INVOICE_SUBTOTAL,
            releaseEncumbrance: false,
          }).then((invoice) => f.set(R.INVOICE_1, invoice, (v) => Invoices.deleteInvoiceViaApi(v.id)));
        })
        .step((f) => {
          // Precondition 10: Invoice #1 approved (creates Pending payment transaction)
          return Invoices.changeInvoiceStatusViaApi({
            invoice: f.get(R.INVOICE_1),
            status: INVOICE_STATUSES.APPROVED,
          });
        })
        .step((f) => {
          // Precondition 11: Invoice #2 created with Fund A distribution
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: f.get(R.ORG).id,
            fiscalYearId: f.get(R.FY_NEXT).id,
            accountingCode: f.get(R.ORG).erpCode,
            fundDistributions: [
              {
                code: f.get(R.FUND_A).code,
                fundId: f.get(R.FUND_A).id,
                value: 100,
              },
            ],
            subTotal: INVOICE_SUBTOTAL,
            releaseEncumbrance: false,
          }).then((invoice) => f.set(R.INVOICE_2, invoice, (v) => Invoices.deleteInvoiceViaApi(v.id)));
        })
        .step((f) => {
          // Precondition 12: Invoice #2 approved and paid (creates Payment transaction)
          return Invoices.changeInvoiceStatusViaApi({
            invoice: f.get(R.INVOICE_2),
            status: INVOICE_STATUSES.PAID,
          });
        })
        .step((f) => {
          // Precondition 13: Credit Invoice #3 created with negative amount and Fund A distribution
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: f.get(R.ORG).id,
            fiscalYearId: f.get(R.FY_NEXT).id,
            accountingCode: f.get(R.ORG).erpCode,
            fundDistributions: [
              {
                code: f.get(R.FUND_A).code,
                fundId: f.get(R.FUND_A).id,
                value: 100,
              },
            ],
            subTotal: CREDIT_INVOICE_SUBTOTAL,
            releaseEncumbrance: false,
          }).then((invoice) => f.set(R.INVOICE_3, invoice, (v) => Invoices.deleteInvoiceViaApi(v.id)));
        })
        .step((f) => {
          // Precondition 14: Credit Invoice #3 approved and paid (creates Credit transaction)
          return Invoices.changeInvoiceStatusViaApi({
            invoice: f.get(R.INVOICE_3),
            status: INVOICE_STATUSES.PAID,
          });
        })
        .step((f) => {
          // Precondition 15: User with Finance: View fund and budget permission
          return cy
            .createTempUser([Permissions.uiFinanceViewFundAndBudget.gui])
            .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
        })
        .step((f) => {
          // Precondition 16: Log in and navigate to Finance app
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: `${TopMenu.fundPath}/view/${f.get(R.FUND_A).id}`,
            waiter: FundDetails.waitLoading,
          });
        });
    });

    after('Delete C451615 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C451615 Correct page title when "Rollover transfer" and other transaction details pane are opened ("Finance" app) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C451615'] },
      () => {
        cy.log('<--- STEP 1 --->');
        FundDetails.viewTransactionsForCurrentBudget();
        cy.title().should('eq', FINANCE_FOLIO_TITLE);

        cy.log('<--- STEP 2 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.ROLLOVER_TRANSFER);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.ROLLOVER_TRANSFER} - FOLIO`);

        // Step 3: Add to bookmarks — browser bookmark action not automatable in Cypress

        cy.log('<--- STEP 4 --->');
        TransactionDetails.closeTransactionDetails();
        cy.title().should('eq', FINANCE_FOLIO_TITLE);

        cy.log('<--- STEP 5 --->');
        Transactions.selectTransaction(
          TRANSACTION_TYPES.ALLOCATION,
          formatCurrency(ALLOCATION_INCREASE_AMOUNT, flow.get(R.LOCALE)),
        );
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.ALLOCATION} - FOLIO`);

        cy.log('<--- STEP 6 --->');
        TransactionDetails.closeTransactionDetails();
        cy.title().should('eq', FINANCE_FOLIO_TITLE);

        cy.log('<--- STEP 7 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.CREDIT);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.CREDIT} - FOLIO`);

        cy.log('<--- STEP 8 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.ENCUMBRANCE);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.ENCUMBRANCE} - FOLIO`);

        cy.log('<--- STEP 9 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.PAYMENT);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.PAYMENT} - FOLIO`);

        cy.log('<--- STEP 10 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.PENDING_PAYMENT);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.PENDING_PAYMENT} - FOLIO`);

        cy.log('<--- STEP 11 --->');
        Transactions.selectTransaction(TRANSACTION_TYPES.TRANSFER);
        cy.title().should('eq', `Finance - ${TRANSACTION_TYPES.TRANSFER} - FOLIO`);

        // Step 12: Add to bookmarks — browser bookmark action not automatable in Cypress
      },
    );
  });
});
