import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
} from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import getRandomPostfix from '../../support/utils/stringTools';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const orderLinePrice = 10;

  const testData = {
    organizationFirst: NewOrganization.getDefaultOrganization(),
    organizationSecond: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    order: {},
    orderLine: {},
    invoice: {},
    invoiceLine: {
      description: `AT_C396375_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '10',
    },
    user: {},
  };

  const buttonConditions = {
    saveCloseDisabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
    ],
    saveCloseEnabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
    ],
  };

  const createFiscalYearLedgerFundAndBudget = () => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    return cy.then(() => {
      testData.fiscalYear = fiscalYear;
      testData.ledger = ledger;
      testData.fund = fund;
      testData.budget = budget;
    });
  };

  const createOrganizations = () => {
    return Organizations.createOrganizationViaApi(testData.organizationFirst)
      .then((id) => {
        testData.organizationFirst.id = id;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organizationSecond))
      .then((id) => {
        testData.organizationSecond.id = id;
      });
  };

  const getAcquisitionMethodId = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;
      });
  };

  const createOpenOrderWithLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organizationFirst.id }),
    )
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: testData.order.id,
            title: `AT_C396375_orderLine_${getRandomPostfix()}`,
            listUnitPrice: orderLinePrice,
            poLineEstimatedPrice: orderLinePrice,
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

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const createInvoiceFromOrder = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organizationFirst.id,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: testData.orderLine.id,
      fundDistributions: testData.orderLine.fundDistribution,
      subTotal: orderLinePrice,
      exportToAccounting: false,
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
        Permissions.uiOrdersView.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      });
  };

  const checkInvoiceDetailsWithVendorCodes = (invoiceVendor, status) => {
    // Invoice line #1 is linked to PO line
    const invoiceLineFirst = {
      poNumber: testData.order.poNumber,
      vendorCode: testData.organizationFirst.code,
    };
    // Invoice line #2 is not linked to PO line
    const invoiceLineSecond = {
      description: testData.invoiceLine.description,
      vendorCode: invoiceVendor.code,
    };

    InvoiceView.checkInvoiceDetails({
      title: testData.invoice.vendorInvoiceNo,
      invoiceInformation: [{ key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: status }],
      vendorDetails: [{ key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: invoiceVendor.name }],
      invoiceLines: [invoiceLineFirst, invoiceLineSecond],
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    createFiscalYearLedgerFundAndBudget()
      .then(createOrganizations)
      .then(getAcquisitionMethodId)
      .then(createOpenOrderWithLine)
      .then(createInvoiceFromOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organizationFirst.id);
      Organizations.deleteOrganizationViaApi(testData.organizationSecond.id);
    });
  });

  it(
    'C396375 Display Vendor code in Invoice line accordion when invoice line is not linked to PO line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C396375', 'nonParallel'] },
    () => {
      // Step 1: Open Invoice and check invoice details
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        vendorDetails: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organizationFirst.name },
        ],
        invoiceLines: [
          { poNumber: testData.order.poNumber, vendorCode: testData.organizationFirst.code },
        ],
      });

      // Step 2: Add a new invoice line as a blank line
      InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 3: Fill in "Description", "Quantity", "Sub-total" fields
      InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 4: Click "Save & close" button in "Create vendor invoice line" form
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      checkInvoiceDetailsWithVendorCodes(testData.organizationFirst, INVOICE_STATUSES.OPEN);

      // Step 5: Click on invoice line #2
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.checkInvoiceLineDetails({ title: 2 });

      // Step 6: Edit invoice line
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 7: Add fund distribution
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 8: Click "Save & close" button in "Edit invoice line - 2" form
      InvoiceLineEditForm.clickSaveButton();
      checkInvoiceDetailsWithVendorCodes(testData.organizationFirst, INVOICE_STATUSES.OPEN);

      // Step 9: Edit invoice
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        {
          label: INVOICE_VIEW_FIELDS.VENDOR_NAME,
          conditions: { value: testData.organizationFirst.name },
        },
        ...buttonConditions.saveCloseDisabled,
      ]);

      // Step 10: Click "Organization look-up" link => Select "Vendor B" in "Select Organization" modal
      InvoiceEditForm.selectVendorOnUi(testData.organizationSecond.name);
      InvoiceEditForm.checkButtonsConditions([
        {
          label: INVOICE_VIEW_FIELDS.VENDOR_NAME,
          conditions: { value: testData.organizationSecond.name },
        },
        ...buttonConditions.saveCloseEnabled,
      ]);

      // Step 11: Fill in "Payment method" cleared after vendor change => Click "Save & close" button
      InvoiceEditForm.fillInvoiceFields({ paymentMethod: INVOICE_PAYMENT_METHODS.CASH });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      checkInvoiceDetailsWithVendorCodes(testData.organizationSecond, INVOICE_STATUSES.OPEN);

      // Step 12: Approve invoice and check invoice details
      InvoiceView.approveInvoice();
      checkInvoiceDetailsWithVendorCodes(testData.organizationSecond, INVOICE_STATUSES.APPROVED);

      // Step 13: Pay invoice and check invoice details
      InvoiceView.payInvoice();
      checkInvoiceDetailsWithVendorCodes(testData.organizationSecond, INVOICE_STATUSES.PAID);

      // Step 14: Cancel invoice and check invoice details
      InvoiceView.cancelInvoice();
      checkInvoiceDetailsWithVendorCodes(testData.organizationSecond, INVOICE_STATUSES.CANCELLED);
    },
  );
});
