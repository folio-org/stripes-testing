import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { BudgetDetails, Budgets, FundDetails, Transactions } from '../../support/fragments/finance';
import { Approvals } from '../../support/fragments/settings/invoices';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import InteractorsTools from '../../support/utils/interactorsTools';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Approval', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {},
      fund: {},
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      approvedInvoice: {},
      openInvoice: {},
      invoiceCurrency: 'CAD',
      exchangeRate: 2,
      newExchangeRate: '3',
      user: {},
    };

    const createFinanceData = () => {
      const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: false },
        budget: { allocated: 100, allowableExpenditure: 110, allowableEncumbrance: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
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
              listUnitPrice: 50,
              poLineEstimatedPrice: 50,
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
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

    const createInvoice = ({ invoiceKey, currency, exchangeRate }) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.orderLine.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        currency,
        exchangeRate,
        fundDistributions: testData.orderLine.fundDistribution,
        subTotal: 50,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoice) => {
        testData[invoiceKey] = invoice;
      });
    };

    // Invoice #1 is in a non-default currency with the exchange rate set manually
    const createApprovedInvoice = () => {
      return createInvoice({
        invoiceKey: 'approvedInvoice',
        currency: testData.invoiceCurrency,
        exchangeRate: testData.exchangeRate,
      }).then(() => Invoices.changeInvoiceStatusViaApi({
        invoice: testData.approvedInvoice,
        status: INVOICE_STATUSES.APPROVED,
      }));
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
      Approvals.setApprovePayValueViaApi(false);

      cy.then(createFinanceData)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(createApprovedInvoice)
        .then(createOpenInvoice)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Invoices.deleteInvoiceViaApi(testData.openInvoice.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    const checkEncumbranceRestrictionResponse = (interception) => {
      InvoiceView.checkErrorInvoiceApiResponse(interception, {
        expectedStatus: 422,
        expectedMessage: InvoiceStates.encumbranceRestrictionMessage,
        expectedErrorCode: InvoiceStates.budgetRestrictedEncumbranceCode,
        expectedFundCode: testData.fund.code,
      });
    };

    it(
      'C1231686 Check the encumbrance restriction error messages when approving and editing an invoice with a single fund distribution (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1231686', 'nonParallel'] },
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
          InvoiceStates.allowableEncumbranceExceeded(testData.fund.code),
        );
        cy.wait('@updateInvoice').then(checkEncumbranceRestrictionResponse);
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

        // Step 4: Approve the invoice
        cy.intercept('PUT', `**/invoice/invoices/${testData.openInvoice.id}*`).as('approveInvoice');
        InvoiceView.clickApproveAndPayInvoice();
        ApproveInvoiceModal.clickOnlySubmitButton();
        InteractorsTools.checkCalloutErrorMessage(
          InvoiceStates.allowableEncumbranceExceeded(testData.fund.code),
        );
        cy.wait('@approveInvoice').then(checkEncumbranceRestrictionResponse);
        InvoiceView.checkInvoiceDetails({
          title: testData.openInvoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          ],
        });

        // Step 5: Open the current budget of the fund from the invoice line
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: '$0.00' },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: '$100.00' },
          ],
        });

        // Step 6: Click "View transactions" link, only three transactions are in the list
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
            { type: TRANSACTION_TYPES.ALLOCATION, amount: '$100.00' },
          ],
        });
      },
    );
  });
});
