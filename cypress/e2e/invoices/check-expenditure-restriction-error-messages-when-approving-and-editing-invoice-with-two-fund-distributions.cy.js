import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  BudgetDetails,
  Budgets,
  FundDetails,
  Funds,
  Transactions,
} from '../../support/fragments/finance';
import { Approvals } from '../../support/fragments/settings/invoices';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InteractorsTools from '../../support/utils/interactorsTools';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Approval', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {},
      ledger: {},
      fundA: {},
      fundB: {},
      budget: { allocated: 100, allowableExpenditure: 100, allowableEncumbrance: 110 },
      fundBAllocated: 150,
      acquisitionMethod: {},
      order: {},
      firstOrderLine: {},
      secondOrderLine: {},
      approvedInvoice: {},
      openInvoice: {},
      invoiceCurrency: 'CAD',
      exchangeRate: 2,
      newExchangeRate: '3',
      user: {},
    };

    const createFinanceData = () => {
      const { fiscalYear, ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictExpenditures: true, restrictEncumbrance: false },
        budget: testData.budget,
      });

      testData.fiscalYear = fiscalYear;
      testData.ledger = ledger;
      testData.fundA = fund;
    };

    // Fund B has more money, so only Fund A exceeds the expenditure limit when the exchange rate of Invoice #1 is changed
    const createFundBWithBudget = () => {
      testData.fundB = { ...Funds.getDefaultFund(), ledgerId: testData.ledger.id };

      return Funds.createViaApi(testData.fundB).then(() => Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        ...testData.budget,
        allocated: testData.fundBAllocated,
        fiscalYearId: testData.fiscalYear.id,
        fundId: testData.fundB.id,
      }));
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

    const setOrderLinesLimit = () => {
      return OrderLinesLimit.setPOLLimitViaApi(3);
    };

    const getOrderLine = (fund) => {
      return BasicOrderLine.getDefaultOrderLine({
        purchaseOrderId: testData.order.id,
        acquisitionMethod: testData.acquisitionMethod.id,
        listUnitPrice: 50,
        poLineEstimatedPrice: 50,
        fundDistribution: [
          {
            code: fund.code,
            fundId: fund.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
      });
    };

    // PO line #1 is encumbered against Fund A, PO line #2 against Fund B
    const createOrderWithOrderLines = () => {
      return Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      )
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(getOrderLine(testData.fundA));
        })
        .then((orderLine) => {
          testData.firstOrderLine = orderLine;

          return OrderLines.createOrderLineViaApi(getOrderLine(testData.fundB));
        })
        .then((orderLine) => {
          testData.secondOrderLine = orderLine;
        });
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => OrderLines.getOrderLineByIdViaApi(testData.firstOrderLine.id))
        .then((orderLine) => {
          testData.firstOrderLine = orderLine;

          return OrderLines.getOrderLineByIdViaApi(testData.secondOrderLine.id);
        })
        .then((orderLine) => {
          testData.secondOrderLine = orderLine;
        });
    };

    const createInvoice = ({ invoiceKey, currency, exchangeRate }) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.firstOrderLine.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        currency,
        exchangeRate,
        fundDistributions: testData.firstOrderLine.fundDistribution,
        subTotal: 50,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoice) => {
        testData[invoiceKey] = invoice;
      });
    };

    const createSecondInvoiceLine = () => {
      return Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: testData.approvedInvoice.id,
          invoiceLineStatus: testData.approvedInvoice.status,
          poLineId: testData.secondOrderLine.id,
          fundDistributions: testData.secondOrderLine.fundDistribution,
          accountingCode: testData.organization.erpCode,
          subTotal: 50,
          releaseEncumbrance: true,
        }),
      );
    };

    const approveInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.approvedInvoice,
        status: INVOICE_STATUSES.APPROVED,
      });
    };

    // Invoice #1 is in a non-default currency with the exchange rate set manually
    const createApprovedInvoice = () => {
      return createInvoice({
        invoiceKey: 'approvedInvoice',
        currency: testData.invoiceCurrency,
        exchangeRate: testData.exchangeRate,
      })
        .then(createSecondInvoiceLine)
        .then(approveInvoice);
    };

    const createOpenInvoice = () => {
      return createInvoice({ invoiceKey: 'openInvoice' });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
          Permissions.uiInvoicesApproveInvoices.gui,
          Permissions.uiInvoicesPayInvoices.gui,
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
      Approvals.setApprovePayValueViaApi(true);

      cy.then(createFinanceData)
        .then(createFundBWithBudget)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(setOrderLinesLimit)
        .then(createOrderWithOrderLines)
        .then(openOrder)
        .then(createApprovedInvoice)
        .then(createOpenInvoice)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Approvals.setApprovePayValueViaApi(false);
      Invoices.deleteInvoiceViaApi(testData.openInvoice.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    const checkExpenditureRestrictionResponse = (interception) => {
      InvoiceView.checkErrorInvoiceApiResponse(interception, {
        expectedStatus: 422,
        expectedMessage: InvoiceStates.expenditureRestrictionMessage,
        expectedErrorCode: InvoiceStates.budgetRestrictedExpendituresCode,
        expectedFundCode: testData.fundA.code,
      });
    };

    const checkCurrentBudgetAndTransactions = (allocated) => {
      FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: '$0.00' },
          { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$100.00' },
        ],
      });
      BudgetDetails.clickViewTransactionsLink();
      Transactions.assertResultsTransactionsByType([
        TRANSACTION_TYPES.PENDING_PAYMENT,
        TRANSACTION_TYPES.ENCUMBRANCE,
        TRANSACTION_TYPES.ALLOCATION,
      ]);
      Transactions.checkTransactionsByTypeAndAmount({
        records: [
          { type: TRANSACTION_TYPES.PENDING_PAYMENT, amount: '($100.00)' },
          { type: TRANSACTION_TYPES.ENCUMBRANCE, amount: '$0.00' },
          { type: TRANSACTION_TYPES.ALLOCATION, amount: `${allocated}.00` },
        ],
      });
    };

    it(
      'C1241224 Check the expenditure restriction error messages when approving and editing an invoice with two fund distributions (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1241224', 'nonParallel'] },
      () => {
        // Precondition: details pane of Invoice #1 is opened
        Invoices.selectInvoiceByNumber(testData.approvedInvoice.vendorInvoiceNo);
        InvoiceView.waitLoading();

        // Step 1: Click "Actions" button, select "Edit" option
        InvoiceView.openInvoiceEditForm();
        InvoiceEditForm.checkExchangeRate(testData.exchangeRate);

        // Step 2: Enter new exchange rate, click "Save & close" button
        cy.intercept('PUT', `**/invoice/invoices/${testData.approvedInvoice.id}*`).as(
          'updateInvoice',
        );
        InvoiceEditForm.fillInvoiceFields({ exchangeRate: testData.newExchangeRate });
        InvoiceEditForm.clickSaveButton({ invoiceCreated: false });
        InteractorsTools.checkCalloutErrorMessage(
          InvoiceStates.allowableExpenditureExceeded(testData.fundA.code),
        );
        cy.wait('@updateInvoice').then(checkExpenditureRestrictionResponse);
        InvoiceEditForm.waitLoading();

        // Step 3: Close "Edit" page, navigate to Invoice #2
        InvoiceEditForm.clickCancelButton();
        InvoiceView.waitLoading();
        Invoices.selectInvoiceByNumber(testData.openInvoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          title: testData.openInvoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          ],
        });

        // Step 4: Approve and pay the invoice
        cy.intercept('PUT', `**/invoice/invoices/${testData.openInvoice.id}*`).as(
          'approvePayInvoice',
        );
        InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled: true });
        ApproveInvoiceModal.clickOnlySubmitButton();
        InteractorsTools.checkCalloutErrorMessage(
          InvoiceStates.allowableExpenditureExceeded(testData.fundA.code),
        );
        cy.wait('@approvePayInvoice').then(checkExpenditureRestrictionResponse);
        InvoiceView.waitLoading();

        // Steps 5-6: Open the current budget of Fund A from the invoice line, view its transactions
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.openFundDetailsPane(testData.fundA.name);
        checkCurrentBudgetAndTransactions(testData.budget.allocated);

        // Steps 7-8: Open the current budget of Fund B from invoice line #2 of Invoice #1, view its transactions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.approvedInvoice.vendorInvoiceNo);
        InvoiceView.selectInvoiceLine(1);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.openFundDetailsPane(testData.fundB.name);
        checkCurrentBudgetAndTransactions(testData.fundBAllocated);
      },
    );
  });
});
