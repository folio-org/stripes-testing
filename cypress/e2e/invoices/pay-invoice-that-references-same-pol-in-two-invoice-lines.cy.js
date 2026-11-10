import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_LIST_COLUMNS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
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
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
} from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { DateTools } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C350633_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C350633_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C350633_Organization_${postfix}`,
    };
    testData.invoice = {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C350633_${postfix}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    };

    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
      }).then((budget) => {
        testData.budget = budget;
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // Open order with one electronic PO line: unit price $4, quantity 2, estimated price $8, Fund #1
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
          orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
          cost: {
            listUnitPriceElectronic: 4,
            quantityElectronic: 2,
            currency: 'USD',
            discountType: 'percentage',
            poLineEstimatedPrice: 8,
          },
        }).then((orderLine) => {
          testData.orderLine = orderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInvoiceInvoiceCreate,
          CapabilitySets.uiInvoiceInvoiceApprove,
          CapabilitySets.uiInvoiceInvoicePay,
          CapabilitySets.uiFinanceFundBudgetView,
          CapabilitySets.uiOrdersOrdersView,
        ],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C350633 Pay invoice that references the same POL and 2 different invoice lines (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C350633'] },
    () => {
      // Step 1: Create an invoice for the Organization-Vendor from Preconditions
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.fillInvoiceFields({
        ...testData.invoice,
        vendorName: testData.organization.name,
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      [1, 2].forEach((lineNumber) => {
        // Step 2 (and Step 6): Add invoice line - "Actions" in "Invoice lines" accordion > "New blank line"
        InvoiceView.openInvoiceLineEditForm();

        // Step 3: Select PO line from Preconditions via "POL look-up"
        InvoiceLineEditForm.selectOrderLines(testData.orderLine.poLineNumber);
        InvoiceLineEditForm.checkFieldsConditions([
          { label: 'POL number', conditions: { value: testData.orderLine.poLineNumber } },
        ]);

        // Step 4: Select Fund #1 in "Fund ID" field of "Fund distribution" accordion
        InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
        InvoiceLineEditForm.checkFieldsConditions([
          {
            label: 'Fund ID',
            conditions: { singleValue: `${testData.fund.name} (${testData.fund.code})` },
          },
        ]);

        // Step 5: Check "Release encumbrance" checkbox and click "Save & close"
        InvoiceLineEditForm.checkButtonsConditions([
          { label: 'Release encumbrance', conditions: { disabled: false } },
        ]);
        InvoiceLineEditForm.fillInvoiceLineFields({ releaseEncumbrance: true });
        InvoiceLineEditForm.clickSaveButton();
        if (lineNumber === 1) {
          InteractorsTools.dismissCallout(InvoiceStates.invoiceLineCreatedMessage);
        }
      });

      // Step 6: Current invoice has 2 invoice lines with reference to the same PO line
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [
          { poNumber: testData.orderLine.poLineNumber },
          { poNumber: testData.orderLine.poLineNumber },
        ],
      });

      // Step 7: Approve invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
      FundDetails.viewTransactionsForCurrentBudget();
      Transactions.checkTransactionsByTypeAndAmount({
        records: [{ type: TRANSACTION_TYPES.PENDING_PAYMENT, amount: '$8.00' }],
      });
      Transactions.selectTransaction(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });
      TransactionDetails.closeTransactionDetails();
      Transactions.expandTransactionTypeAccordion();
      Transactions.selectTransactionTypeFilter(TRANSACTION_TYPES.PENDING_PAYMENT);
      Transactions.assertRowCellsContent([
        {
          rowIndex: 0,
          expectedCells: [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSACTION_TYPES.PENDING_PAYMENT },
          ],
        },
        {
          rowIndex: 1,
          expectedCells: [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSACTION_TYPES.PENDING_PAYMENT },
          ],
        },
        {
          rowIndex: 2,
          expectedCells: [
            {
              column: TRANSACTION_LIST_COLUMNS.TYPE,
              content: TRANSACTION_TYPES.PENDING_PAYMENT,
              exists: false,
            },
          ],
        },
      ]);

      // Step 8: Pay invoice
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
      FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Encumbered', value: '$0.00' },
          { key: 'Expended', value: '$16.00' },
        ],
      });
      BudgetDetails.clickViewTransactionsLink();
      Transactions.checkTransactionsByTypeAndAmount({
        records: [{ type: TRANSACTION_TYPES.PAYMENT, amount: '$8.00' }],
      });
      Transactions.checkTransactionsList({
        records: [{ type: TRANSACTION_TYPES.PENDING_PAYMENT }],
        present: false,
      });
      Transactions.selectTransaction(TRANSACTION_TYPES.ENCUMBRANCE);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });
      TransactionDetails.closeTransactionDetails();
      Transactions.expandTransactionTypeAccordion();
      Transactions.selectTransactionTypeFilter(TRANSACTION_TYPES.PAYMENT);
      Transactions.assertRowCellsContent([
        {
          rowIndex: 0,
          expectedCells: [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSACTION_TYPES.PAYMENT },
          ],
        },
        {
          rowIndex: 1,
          expectedCells: [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSACTION_TYPES.PAYMENT },
          ],
        },
        {
          rowIndex: 2,
          expectedCells: [
            {
              column: TRANSACTION_LIST_COLUMNS.TYPE,
              content: TRANSACTION_TYPES.PAYMENT,
              exists: false,
            },
          ],
        },
      ]);
    },
  );
});
