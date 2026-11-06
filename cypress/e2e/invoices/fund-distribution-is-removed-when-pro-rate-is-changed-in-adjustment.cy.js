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
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C825250_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C825250_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C825250_Organization_${postfix}`,
    };
    testData.adjustmentDescription = `AT_C825250_Adjustment_${postfix}`;

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
            listUnitPrice: 100,
            poLineEstimatedPrice: 100,
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

    // Invoice based on the order with a not prorated invoice-level adjustment paid from Fund A
    cy.then(() => {
      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.orderLine.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        fundDistributions: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
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
                code: testData.fund.code,
                fundId: testData.fund.id,
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
    'C825250 Fund distribution is removed when "Pro rate" value is changed in the adjustment (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C825250'] },
    () => {
      // Step 1: Navigate to the invoice
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ fundCode: testData.fund.code }],
        invoiceFundDistributions: [{ fund: testData.fund.code }],
      });

      // Step 2: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();

      // Step 3: Change "Pro rate" from "Not prorated" to "By line"
      InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: ADJUSTMENT_PRORATE.BY_LINE });
      InvoiceEditForm.checkAdjustmentFundDistributionAbsent();

      // Step 4: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceFundDistributionSectionAbsent();

      // Step 5: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkAdjustmentFundDistributionAbsent();

      // Step 6: GET invoice response has no fund distributions in the adjustment
      Invoices.getInvoiceByIdViaApi(testData.invoice.id).then(({ adjustments }) => {
        expect(adjustments[0].fundDistributions).to.have.lengthOf(0);
      });
    },
  );
});
