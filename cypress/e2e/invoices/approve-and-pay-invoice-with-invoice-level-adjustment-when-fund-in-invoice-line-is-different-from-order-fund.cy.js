import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  Budgets,
  FundDetails,
  Funds,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { Approvals } from '../../support/fragments/settings/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
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
      budget: { allocated: 1000 },
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      invoice: {},
      adjustmentDescription: `autotest_adjustment_${getRandomPostfix()}`,
      user: {},
    };

    const createFinanceData = () => {
      const { fiscalYear, ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: testData.budget,
      });

      testData.fiscalYear = fiscalYear;
      testData.ledger = ledger;
      testData.fundA = fund;
    };

    const createFundBWithBudget = () => {
      testData.fundB = { ...Funds.getDefaultFund(), ledgerId: testData.ledger.id };

      return Funds.createViaApi(testData.fundB).then(() => Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        ...testData.budget,
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

    // The PO line is encumbered against Fund A
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
              listUnitPrice: 100,
              poLineEstimatedPrice: 100,
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

    // The invoice line is paid from Fund B, the invoice-level adjustment from Fund A
    const createInvoice = () => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.orderLine.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        fundDistributions: [
          {
            code: testData.fundB.code,
            fundId: testData.fundB.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        adjustments: [
          {
            description: testData.adjustmentDescription,
            value: 10,
            type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            exportToAccounting: false,
            fundDistributions: [
              {
                code: testData.fundA.code,
                fundId: testData.fundA.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          },
        ],
        subTotal: 100,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
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
      Approvals.setApprovePayValueViaApi(false);

      cy.then(createFinanceData)
        .then(createFundBWithBudget)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(createInvoice)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    it(
      "C825243 Approve and pay an invoice with an invoice-level adjustment when the fund in the invoice line is different from the order's fund (thunderjet)",
      { tags: ['criticalPath', 'thunderjet', 'C825243', 'nonParallel'] },
      () => {
        // Step 1: Navigate to the invoice
        Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
            { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
            { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$110.00' },
          ],
          invoiceLines: [{ fundCode: testData.fundB.code }],
          invoiceFundDistributions: [{ fund: testData.fundA.code }],
        });

        // Step 2: Approve the invoice
        InvoiceView.approveInvoice();
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          ],
        });

        // Step 3: Pay the invoice
        InvoiceView.payInvoice();
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          ],
        });

        // Step 4: Click on the invoice line, "Current encumbrance" is blank
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundB.name, currentEncumbrance: '-' },
        ]);

        // Step 5: Click on the PO line number link
        InvoiceLineDetails.openPOLineFromInvoiceLine();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkOrderLineDetails({
          poLineInformation: [
            {
              key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
              value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID,
            },
          ],
        });
        OrderLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundA.name, currentEncumbrance: '$0.00' },
        ]);

        // Step 6: Click on the "Current encumbrance" link, the encumbrance of Fund A is released
        OrderLineDetails.openEncumbrancePane(testData.fundA.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundA.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          ],
        });

        // Step 7: Close the "Encumbrance" pane, Fund A has only one payment for the adjustment
        TransactionDetails.closeTransactionDetails();
        Transactions.checkTransactionsList({
          records: [{ type: TRANSACTION_TYPES.PAYMENT, amount: '$10.00' }],
        });
        Funds.checkTransactionCount(TRANSACTION_TYPES.PAYMENT, 1);

        // Step 8: Click on the payment transaction
        Transactions.selectTransaction(TRANSACTION_TYPES.PAYMENT);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($10.00)' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.invoice.vendorInvoiceNo },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundA.name },
          ],
        });

        // Step 9: Navigate to Fund B, view transactions for the current budget
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.openFundDetailsPane(testData.fundB.name);
        FundDetails.viewTransactionsForCurrentBudget();
        Transactions.checkTransactionsList({
          records: [{ type: TRANSACTION_TYPES.PAYMENT, amount: '$100.00' }],
        });
        Funds.checkTransactionCount(TRANSACTION_TYPES.PAYMENT, 1);

        // Step 10: Click on the payment transaction
        Transactions.selectTransaction(TRANSACTION_TYPES.PAYMENT);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($100.00)' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.invoice.vendorInvoiceNo },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundB.name },
          ],
        });
      },
    );
  });
});
