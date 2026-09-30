import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  BUDGET_STATUSES,
  ENCUMBRANCE_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';

import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  FundDetails,
  Funds,
  Ledgers,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import CancelInvoiceModal from '../../support/fragments/invoices/modal/cancelInvoiceModal';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Cancellation', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `autotest_year_${getRandomPostfix()}`,
        code: `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      ledger: {},
      fundA: {},
      fundB: {},
      budgetA: {},
      budgetB: {},
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      invoice: {},
      user: {},
    };

    const createFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYear) => {
        testData.fiscalYear = fiscalYear;
      });
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYear.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = ({ fundKey, budgetKey }) => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id })
        .then((fundResponse) => {
          testData[fundKey] = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: testData[fundKey].id,
            allocated: 1000,
          });
        })
        .then((budget) => {
          testData[budgetKey] = budget;
        });
    };

    const createFundsWithBudgets = () => {
      return createFundWithBudget({ fundKey: 'fundA', budgetKey: 'budgetA' }).then(() => {
        return createFundWithBudget({ fundKey: 'fundB', budgetKey: 'budgetB' });
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethod = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethod = body.acquisitionMethods[0];
        });
    };

    const createOrderWithOrderLine = () => {
      return Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      )
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
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
        });
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
        .then((orderLine) => {
          testData.orderLine = orderLine;
        });
    };

    const createInvoice = () => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    };

    const createInvoiceLine = ({ poLineId, subTotal }) => {
      return Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: testData.invoice.id,
          invoiceLineStatus: INVOICE_STATUSES.OPEN,
          poLineId,
          fundDistributions: [
            {
              code: testData.fundB.code,
              fundId: testData.fundB.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
          accountingCode: testData.organization.erpCode,
          subTotal,
          releaseEncumbrance: true,
        }),
      );
    };

    // Invoice line #1 is not related to any PO line, invoice line #2 is related to the PO line, both are paid from Fund B
    const createInvoiceLines = () => {
      return createInvoiceLine({ subTotal: 5 }).then(() => {
        return createInvoiceLine({ poLineId: testData.orderLine.id, subTotal: 10 });
      });
    };

    const approveInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.APPROVED,
      });
    };

    const setFundABudgetToInactive = () => {
      return Budgets.getBudgetByIdViaApi(testData.budgetA.id).then((budget) => {
        return Budgets.updateBudgetViaApi({ ...budget, budgetStatus: BUDGET_STATUSES.INACTIVE });
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
          Permissions.uiInvoicesCancelInvoices.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createFiscalYear()
        .then(createLedger)
        .then(createFundsWithBudgets)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(createInvoice)
        .then(createInvoiceLines)
        .then(approveInvoice)
        .then(setFundABudgetToInactive)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C1045977 Voided transactions are not created after cancelling an approved invoice when the fund in the PO line has an inactive budget (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1045977'] },
      () => {
        // Step 1: Cancel the invoice, it is not cancelled because the budget of Fund A is inactive
        Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();
        InvoiceView.clickCancelInActionsMenu();
        CancelInvoiceModal.clickSubmitButton(false);
        InteractorsTools.checkCalloutErrorMessage(
          InvoiceStates.budgetNotFoundByFund(testData.fundA.code),
        );
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          ],
        });

        // Step 2: Invoice line #2 has no encumbrance
        InvoiceView.selectInvoiceLine(1);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundB.name, initialEncumbrance: '-', currentEncumbrance: '-' },
        ]);

        // Step 3: Both invoice lines are still awaiting payment in the current budget of Fund B
        InvoiceLineDetails.openFundDetailsPane(testData.fundB.name);
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$15.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$0.00' },
          ],
        });

        // Step 4: The pending payment transactions of Fund B are not voided
        BudgetDetails.clickViewTransactionsLink();
        Transactions.checkTransactionsList({
          records: [
            { type: TRANSACTION_TYPES.PENDING_PAYMENT, amount: '$5.00' },
            { type: TRANSACTION_TYPES.PENDING_PAYMENT, amount: '$10.00' },
          ],
        });

        // Step 5: The encumbrance of the PO line is released
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundA.name, currentEncumbrance: '$0.00' },
        ]);

        // Step 6: Check the released encumbrance of Fund A
        OrderLineDetails.openEncumbrancePane(testData.fundA.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundA.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          ],
        });
      },
    );
  });
});
