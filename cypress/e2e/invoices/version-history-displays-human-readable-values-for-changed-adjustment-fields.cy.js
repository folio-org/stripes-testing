import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
} from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  // Invoice version history pane reuses the order line pane id
  const versionHistoryPane = 'order-line';
  const invoiceLineVersionHistoryPane = 'invoice-line-pane';
  const adjustmentChangedFields = [
    'Adjustment description',
    'Adjustment export to accounting',
    'Adjustment pro rate',
    'Adjustment relation to total',
    'Adjustment type',
    'Adjustment value',
  ];
  const invoiceAdjustmentChangedFields = [
    ...adjustmentChangedFields,
    'Adjustments',
    'Calculated total amount',
    'Fund distribution code',
    'Fund distribution ID',
    'Fund distribution type',
    'Fund distribution value',
    'Total adjustments',
  ];
  const invoiceLineAdjustmentChangedFields = [
    ...adjustmentChangedFields,
    'Total',
    'Total adjustments',
  ];
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C877080_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C877080_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C877080_Organization_${postfix}`,
    };
    testData.invoiceAdjustmentDescription = `AT_C877080_InvoiceAdjustment_${postfix}`;
    testData.invoiceLineAdjustmentDescription = `AT_C877080_InvoiceLineAdjustment_${postfix}`;

    cy.getAdminToken();
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

    // Open order with one PO line, fund distribution is Fund A
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
        });
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });

    // Invoice based on the order
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          poLineId: orderLine.id,
          invoiceStatus: INVOICE_STATUSES.OPEN,
          fundDistributions: orderLine.fundDistribution,
          subTotal: 10,
          releaseEncumbrance: true,
          exportToAccounting: false,
        }).then((invoice) => {
          testData.invoice = invoice;
        });
      });
    });

    // Invoice level adjustment is added to the invoice after the invoice creation
    cy.then(() => {
      Invoices.getInvoiceByIdViaApi(testData.invoice.id).then((invoice) => {
        Invoices.updateInvoiceViaApi({
          ...invoice,
          adjustments: [
            {
              description: testData.invoiceAdjustmentDescription,
              value: 10,
              type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
              prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
              relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
              exportToAccounting: true,
              fundDistributions: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            },
          ],
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
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
    'C877080 Version history for Invoice and Invoice Line displays human-readable values for all changed adjustment fields (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C877080'] },
    () => {
      // Step 1: Click on the invoice name link on "Invoices" pane
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceFundDistributions: [{ fund: testData.fund.code }],
        invoiceLevelAdjustments: [
          {
            description: testData.invoiceAdjustmentDescription,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
          },
        ],
      });

      // Step 2: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.verifyVersionsCount(versionHistoryPane, 3);
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 2,
        isOriginal: true,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView('invoice', [
        testData.invoiceAdjustmentDescription,
        '10%',
        ADJUSTMENT_PRORATE.NOT_PRORATED,
        ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        '$1.00',
        '$11.00',
      ]);

      // Step 3: Check the content of the "Current version" card
      // "Fiscal year" is set when the invoice line is created via API, so it is in the previous version
      AcqVersionHistory.clickShowAllButtonInCard(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        changedFields: invoiceAdjustmentChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(versionHistoryPane, {
        index: 0,
        count: invoiceAdjustmentChangedFields.length,
      });

      // Step 4: Close "Version history" pane, edit invoice, remove the adjustment, save
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ deleteAdjustments: 1 });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceFundDistributionSectionAbsent();
      InvoiceView.checkInvoiceLevelAdjustmentsSectionAbsent();

      // Step 5: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.clickShowAllButtonInCard(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        changedFields: invoiceAdjustmentChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(versionHistoryPane, {
        index: 0,
        count: invoiceAdjustmentChangedFields.length,
      });

      // Step 6: Close "Version history" pane, open invoice line, click "Actions" > "Edit"
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openInvoiceLineEditForm();

      // Step 7: Add invoice line adjustment, click "Save & close" button
      Invoices.addAdjustmentToInvoiceLine(
        testData.invoiceLineAdjustmentDescription,
        '5',
        '$',
        ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        true,
      );
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);

      // Step 8: Click on the invoice line record, click "Version history" icon
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        changedFields: invoiceLineAdjustmentChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(invoiceLineVersionHistoryPane, {
        index: 0,
        count: invoiceLineAdjustmentChangedFields.length,
      });
    },
  );
});
