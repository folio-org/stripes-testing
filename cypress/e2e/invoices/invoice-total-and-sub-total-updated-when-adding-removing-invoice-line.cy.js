import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C663350_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C663350_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C663350_Organization_${postfix}`,
    };
    testData.adjustmentDescription = `AT_C663350_Adjustment_${postfix}`;

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

    // Open order with one PO line: Fund A, quantity 1, unit price 10
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: 10,
            poLineEstimatedPrice: 10,
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
          testData.orderLine = orderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Invoice based on the order (invoice line #1) and blank invoice line #2 with sub-total 20
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          fiscalYearId: testData.fiscalYear.id,
          poLineId: orderLine.id,
          invoiceStatus: INVOICE_STATUSES.OPEN,
          fundDistributions: orderLine.fundDistribution,
          subTotal: 10,
          releaseEncumbrance: true,
          exportToAccounting: false,
        }).then((invoice) => {
          testData.invoice = invoice;

          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              fundDistributions: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
              subTotal: 20,
            }),
          );
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceDelete],
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
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id, false);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C663350 Invoice total and sub-total are updated when adding/removing invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C663350'] },
    () => {
      // Step 1: Click on the invoice
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$30.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$30.00' },
        ],
      });
      InvoiceView.checkInvoiceLinesTableContent([{ number: 1 }, { number: 2 }]);

      // Step 2: Open invoice line #1, click "Actions" button, select "Edit" option
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.openInvoiceLineEditForm();

      // Step 3: Change "Sub-total" to 15, add $10 "In addition to" adjustment, save
      InvoiceLineEditForm.fillInvoiceLineFields({ subTotal: '15' });
      Invoices.addAdjustmentToInvoiceLine(
        testData.adjustmentDescription,
        '10',
        '$',
        ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
      );
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
      InteractorsTools.dismissCallout(InvoiceStates.invoiceLineCreatedMessage);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$35.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$45.00' },
        ],
      });

      // Step 4: Edit invoice line #2, change "Sub-total" to -20, save
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.setNegativeSubTotal(20);
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '-$5.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$5.00' },
        ],
      });

      // Step 5: Delete invoice line #2
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.deleteInvoiceLine(2);
      InteractorsTools.dismissCallout(InvoiceStates.invoiceLineDeletedMessage);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$15.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$25.00' },
        ],
      });

      // Step 6: Delete invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.deleteInvoiceLine(1);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$0.00' },
        ],
      });

      // Step 7: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkHighlightedFieldsInVersionView('invoice', ['$0.00']);
      AcqVersionHistory.checkFieldsInVersionView('invoice', [
        { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$0.00' },
        { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$0.00' },
        { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$0.00' },
      ]);

      // Step 8: Click title link of the second card
      AcqVersionHistory.clickVersionHistoryCardTitle('order-line', { index: 1 });
      AcqVersionHistory.checkVersionHistoryCardIsActive('order-line', { index: 1 });
      AcqVersionHistory.checkHighlightedFieldsInVersionView('invoice', ['$15.00', '$25.00'], {
        notHighlighted: ['$10.00'],
      });
      AcqVersionHistory.checkFieldsInVersionView('invoice', [
        { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$15.00' },
        { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
        { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$25.00' },
      ]);

      // Step 9: Click title link of the third card
      AcqVersionHistory.clickVersionHistoryCardTitle('order-line', { index: 2 });
      AcqVersionHistory.checkVersionHistoryCardIsActive('order-line', { index: 2 });
      AcqVersionHistory.checkHighlightedFieldsInVersionView('invoice', ['-$5.00', '$5.00'], {
        notHighlighted: ['$10.00'],
      });
      AcqVersionHistory.checkFieldsInVersionView('invoice', [
        { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '-$5.00' },
        { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$10.00' },
        { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$5.00' },
      ]);

      // Step 10: Close "Version history" pane
      AcqVersionHistory.closeVersionHistory('order-line');
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$0.00' },
        ],
      });
    },
  );
});
