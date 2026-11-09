import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C1282784_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C1282784_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1282784_Organization_${postfix}`,
    };
    testData.adjustment = {
      description: `AT_C1282784_Discount_${postfix}`,
      value: -20,
      type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
      prorate: ADJUSTMENT_PRORATE.BY_AMOUNT,
      relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
      exportToAccounting: false,
    };
    testData.orderLines = [];

    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
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

    // Order #1 with a $10.00 PO line and Order #2 with a $30.00 PO line, both opened, Fund A
    cy.then(() => {
      [10, 30].forEach((price) => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: price,
              poLineEstimatedPrice: price,
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          ).then((orderLine) => {
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
            OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
              testData.orderLines.push(openedOrderLine);
            });
          });
        });
      });
    });

    // Paid invoice based on Order #1 with the invoice-level prorated adjustment
    cy.then(() => {
      const [orderLine1] = testData.orderLines;

      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        poLineId: orderLine1.id,
        fiscalYearId: testData.fiscalYear.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        fundDistributions: orderLine1.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 10,
        releaseEncumbrance: true,
        exportToAccounting: false,
        adjustments: [testData.adjustment],
      }).then((invoice) => {
        testData.invoice = invoice;

        Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit, CapabilitySets.uiInvoiceInvoiceCreate],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.duplicatedInvoiceId) {
      Invoices.deleteInvoiceViaApi(testData.duplicatedInvoiceId);
    }
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C1282784 Change an invoice line in a duplicated paid invoice with an invoice-level prorated adjustment (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1282784'] },
    () => {
      const orderLine2 = testData.orderLines[1];
      const invoiceLevelAdjustments = [
        {
          description: testData.adjustment.description,
          value: '-20%',
          prorate: testData.adjustment.prorate,
          relationToTotal: testData.adjustment.relationToTotal,
        },
      ];

      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();

      // Step 1: Duplicate the paid invoice
      Invoices.selectDuplicateInvoice();
      Invoices.interceptPostInvoices();
      DuplicateInvoiceModal.clickDuplicateButton();
      Invoices.waitForInvoicesPostQueryCompleted().then(({ response }) => {
        testData.duplicatedInvoiceId = response.body.id;
      });
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$10.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '-$2.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$8.00' },
        ],
        invoiceLines: [
          // The "Fully paid" PO line icon is followed by a non-breaking space
          {
            number: ' 1',
            quantity: '1',
            subTotal: '$10.00',
            adjustments: '-$2.00',
            total: '$8.00',
          },
        ],
        invoiceLevelAdjustments,
      });

      // Step 2: Open the invoice line edit page, the prorated adjustment is converted to amount
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAdjustment({
        description: testData.adjustment.description,
        value: '-2',
        type: '$',
        relationToTotal: testData.adjustment.relationToTotal,
      });

      // Step 3: Link the invoice line to the PO line of Order #2, click "Save & close"
      InvoiceLineEditForm.selectOrderLines(orderLine2.poLineNumber);
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$30.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '-$6.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$24.00' },
        ],
        invoiceLines: [
          {
            number: 1,
            poNumber: orderLine2.poLineNumber,
            quantity: '1',
            subTotal: '$30.00',
            adjustments: '-$6.00',
            total: '$24.00',
          },
        ],
        invoiceLevelAdjustments,
      });

      // Step 4: Open the invoice line edit page, the adjustment is recalculated for the new sub-total
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAdjustment({
        description: testData.adjustment.description,
        value: '-6',
        type: '$',
        relationToTotal: testData.adjustment.relationToTotal,
      });
    },
  );
});
