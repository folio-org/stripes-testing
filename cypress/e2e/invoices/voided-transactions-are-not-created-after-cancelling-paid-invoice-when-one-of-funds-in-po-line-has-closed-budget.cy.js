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
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';

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
      orderLines: [],
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

    const createOrderLine = ({ fundKey, price }) => {
      return OrderLines.createOrderLineViaApi(
        BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: testData.order.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          listUnitPrice: price,
          poLineEstimatedPrice: price,
          fundDistribution: [
            {
              code: testData[fundKey].code,
              fundId: testData[fundKey].id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        }),
      ).then((orderLine) => {
        testData.orderLines.push(orderLine);
      });
    };

    const createOrderWithTwoOrderLines = () => {
      return Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      )
        .then((order) => {
          testData.order = order;

          return createOrderLine({ fundKey: 'fundA', price: 10 });
        })
        .then(() => createOrderLine({ fundKey: 'fundB', price: 25 }));
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLines[0].id))
        .then((orderLine) => {
          testData.orderLines[0] = orderLine;

          return OrderLines.getOrderLineByIdViaApi(testData.orderLines[1].id);
        })
        .then((orderLine) => {
          testData.orderLines[1] = orderLine;
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

    const createInvoiceLine = ({ orderLine, fundDistributions }) => {
      return Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: testData.invoice.id,
          invoiceLineStatus: INVOICE_STATUSES.OPEN,
          poLineId: orderLine.id,
          fundDistributions,
          accountingCode: testData.organization.erpCode,
          subTotal: orderLine.cost.poLineEstimatedPrice,
          releaseEncumbrance: true,
        }),
      );
    };

    // Both invoice lines are paid from Fund A: invoice line #1 keeps the encumbrance of PO line #1, invoice line #2 has no encumbrance
    const createInvoiceLines = () => {
      return createInvoiceLine({
        orderLine: testData.orderLines[0],
        fundDistributions: testData.orderLines[0].fundDistribution,
      }).then(() => {
        return createInvoiceLine({
          orderLine: testData.orderLines[1],
          fundDistributions: [
            {
              code: testData.fundA.code,
              fundId: testData.fundA.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        });
      });
    };

    const approveInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.APPROVED,
      });
    };

    const payInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.PAID,
      });
    };

    const closeFundBBudget = () => {
      return Budgets.getBudgetByIdViaApi(testData.budgetB.id).then((budget) => {
        return Budgets.updateBudgetViaApi({ ...budget, budgetStatus: BUDGET_STATUSES.CLOSED });
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
      OrderLinesLimit.setPOLLimitViaApi(3);

      createFiscalYear()
        .then(createLedger)
        .then(createFundsWithBudgets)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithTwoOrderLines)
        .then(openOrder)
        .then(createInvoice)
        .then(createInvoiceLines)
        .then(approveInvoice)
        .then(payInvoice)
        .then(closeFundBBudget)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C1045991 Voided transactions are not created after cancelling a paid invoice when one of the funds in the PO line has a closed budget (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1045991'] },
      () => {
        // Step 1: Cancel the invoice, it is not cancelled because the budget of Fund B is closed
        Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();
        InvoiceView.clickCancelInActionsMenu();
        CancelInvoiceModal.clickSubmitButton(false);
        InteractorsTools.checkCalloutErrorMessage(
          InvoiceStates.budgetNotFoundByFund(testData.fundB.code),
        );
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          ],
        });

        // Step 2: The encumbrance of invoice line #1 is released
        InvoiceView.selectInvoiceLine(0);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundA.name, currentEncumbrance: '$0.00' },
        ]);

        // Step 3: Invoice line #2 has no encumbrance
        InvoiceLineDetails.closeInvoiceLineDetailsPane();
        InvoiceView.waitLoading();
        InvoiceView.selectInvoiceLine(1);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundA.name, initialEncumbrance: '-', currentEncumbrance: '-' },
        ]);

        // Step 4: Both invoice lines are still expended in the current budget of Fund A
        InvoiceLineDetails.openFundDetailsPane(testData.fundA.name);
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: '$35.00' },
          ],
        });

        // Step 5: The payment transactions of Fund A are not voided
        BudgetDetails.clickViewTransactionsLink();
        Transactions.checkTransactionsList({
          records: [
            { type: TRANSACTION_TYPES.PAYMENT, amount: '$10.00' },
            { type: TRANSACTION_TYPES.PAYMENT, amount: '$25.00' },
          ],
        });

        // Step 6: The encumbrance of PO line #1 is released
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.openPolDetails(testData.orderLines[0].poLineNumber);
        OrderLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundA.name, currentEncumbrance: '$0.00' },
        ]);

        // Step 7: Check the released encumbrance of Fund A
        OrderLineDetails.openEncumbrancePane(testData.fundA.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLines[0].poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundA.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          ],
        });

        // Step 8: The encumbrance of PO line #2 is released
        TransactionDetails.openSourceInTransactionDetails(testData.orderLines[0].poLineNumber);
        OrderLineDetails.waitLoading();
        OrderLines.viewPO();
        OrderDetails.openPolDetails(testData.orderLines[1].poLineNumber);
        OrderLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundB.name, currentEncumbrance: '$0.00' },
        ]);

        // Step 9: Check the released encumbrance of Fund B
        OrderLineDetails.openEncumbrancePane(testData.fundB.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLines[1].poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundB.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$25.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          ],
        });
      },
    );
  });
});
