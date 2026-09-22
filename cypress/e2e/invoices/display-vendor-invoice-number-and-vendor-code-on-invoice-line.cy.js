import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORGANIZATION_SEARCH_OPTIONS,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
} from '../../support/fragments/invoices';
import { Approvals } from '../../support/fragments/settings/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { DateTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import Permissions from '../../support/dictionary/permissions';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organizationFirst: NewOrganization.getDefaultOrganization(),
    organizationSecond: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    orderFirst: {},
    orderSecond: {},
    orderLineFirst: {},
    orderLineSecond: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumber: `AT_C388554_${getRandomPostfix()}`,
      vendorInvoiceNumberEdited: `AT_C388554_edited_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
      id: null,
    },
    invoiceLine: {
      description: `AT_C388554_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '10',
    },
    vendorCodeEdited: `AT_C388554_code_${getRandomPostfix()}`,
    user: {},
  };

  const createFiscalYearLedgerFundAndBudget = () => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 1000 },
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

  const createOpenOrderWithLine = (orderKey, orderLineKey, organization) => {
    return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organization.id }))
      .then((orderResponse) => {
        testData[orderKey] = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: testData[orderKey].id,
            title: `AT_C388554_${orderLineKey}_${getRandomPostfix()}`,
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
        );
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createOrderFirst = () => {
    return createOpenOrderWithLine('orderFirst', 'orderLineFirst', testData.organizationFirst);
  };

  const createOrderSecond = () => {
    return createOpenOrderWithLine('orderSecond', 'orderLineSecond', testData.organizationSecond);
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  const checkInvoiceLinesPaneHeaders = ({ vendorInvoiceNo, vendorCode }) => {
    [1, 2, 3].forEach((invoiceLineNumber) => {
      InvoiceView.selectInvoiceLine(invoiceLineNumber - 1);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: invoiceLineNumber,
        subtitle: `${vendorInvoiceNo} - ${vendorCode}`,
      });
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      InvoiceView.waitLoading();
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    createFiscalYearLedgerFundAndBudget()
      .then(createOrganizations)
      .then(getAcquisitionMethodId)
      .then(createOrderFirst)
      .then(createOrderSecond)
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
    'C388554 Display on Invoice line "Vendor invoice number" and "Vendor code" associated with the Invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C388554', 'nonParallel'] },
    () => {
      // Step 1: Create new invoice
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();

      // Step 2: Fill in required invoice fields
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroup,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumber,
        vendorName: testData.organizationFirst.name,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 3: Click "Save & close" button, check "Vendor invoice number" and "Vendor code" in pane header
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumber,
        subtitle: testData.organizationFirst.code,
      });

      // Step 4: Check information under "Vendor details" accordion
      InvoiceView.checkInvoiceDetails({
        vendorDetails: [
          {
            key: INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER,
            value: testData.invoice.vendorInvoiceNumber,
          },
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organizationFirst.name },
        ],
      });

      // Create a new invoice line as a blank line
      InvoiceView.openInvoiceLineEditForm();

      // Step 6: Fill in "Description", "Quantity", "Sub-total" fields
      InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 7: Add fund A
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);

      // Step 8: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumber,
        invoiceLines: [{ description: testData.invoiceLine.description }],
      });

      // Step 9: Click on Invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: 1,
        subtitle: `${testData.invoice.vendorInvoiceNumber} - ${testData.organizationFirst.code}`,
      });

      // Step 10: Click "X" button in the top left side of the "View invoice line - 1" pane
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      InvoiceView.waitLoading();

      // Step 11-12: Add line from POL associated with the same vendor
      InvoiceView.openSelectOrderLineModal();
      SelectOrderLinesModal.selectOrderLine(`${testData.orderFirst.poNumber}*`);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumber,
        invoiceLines: [
          { description: testData.invoiceLine.description },
          { poNumber: testData.orderFirst.poNumber, vendorCode: testData.organizationFirst.code },
        ],
      });

      // Step 13: Click on Invoice line #2
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: 2,
        subtitle: `${testData.invoice.vendorInvoiceNumber} - ${testData.organizationFirst.code}`,
      });

      // Step 14: Click "X" button in the top left side of the "View invoice line - 2" pane
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      InvoiceView.waitLoading();

      // Step 15-17: Add line from POL associated with other vendor, confirm "Confirmation" modal
      InvoiceView.openSelectOrderLineModal();
      SelectOrderLinesModal.searchByName(`${testData.orderSecond.poNumber}*`);
      SelectOrderLinesModal.selectFromSearchResults();
      SelectOrderLinesModal.clickSaveButton();
      SelectOrderLinesModal.checkForDifferentVendorWarningAndConfirm();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumber,
        invoiceLines: [
          { description: testData.invoiceLine.description },
          { poNumber: testData.orderFirst.poNumber, vendorCode: testData.organizationFirst.code },
          { poNumber: testData.orderSecond.poNumber, vendorCode: testData.organizationSecond.code },
        ],
      });

      // Step 18: Click on Invoice line #3
      InvoiceView.selectInvoiceLine(2);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: 3,
        subtitle: `${testData.invoice.vendorInvoiceNumber} - ${testData.organizationFirst.code}`,
      });

      // Step 19: Click "X" button in the top left side of the "View invoice line - 3" pane
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      InvoiceView.waitLoading();

      // Step 20-21: Edit "Vendor invoice number" and save invoice
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumberEdited,
        subtitle: testData.organizationFirst.code,
      });

      // Step 22: Check "Vendor invoice number" and "Vendor code" in each "View invoice line" pane
      checkInvoiceLinesPaneHeaders({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
        vendorCode: testData.organizationFirst.code,
      });

      // Step 23: Open organization - vendor edit form
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      OrganizationsSearchAndFilter.searchByParameters(
        ORGANIZATION_SEARCH_OPTIONS.NAME,
        testData.organizationFirst.name,
      );
      Organizations.selectOrganization(testData.organizationFirst.name);
      Organizations.editOrganization();

      // Step 24: Edit "Code" field, save organization and return to "Invoices" app
      Organizations.editOrganizationCode(testData.vendorCodeEdited);
      Organizations.verifySaveOrganizationCalloutMessage(testData.organizationFirst);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumberEdited,
        subtitle: testData.vendorCodeEdited,
      });

      // Step 25: Check "Vendor invoice number" and "Vendor code" in each "View invoice line" pane
      checkInvoiceLinesPaneHeaders({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
        vendorCode: testData.vendorCodeEdited,
      });

      // Step 26: Approve invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Step 27: Check "Vendor invoice number" and "Vendor code" in each "View invoice line" pane
      checkInvoiceLinesPaneHeaders({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
        vendorCode: testData.vendorCodeEdited,
      });

      // Step 28: Pay invoice
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 29: Check "Vendor invoice number" and "Vendor code" in each "View invoice line" pane
      checkInvoiceLinesPaneHeaders({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
        vendorCode: testData.vendorCodeEdited,
      });

      // Step 30: Cancel invoice
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });

      // Step 31: Check "Vendor invoice number" and "Vendor code" in each "View invoice line" pane
      checkInvoiceLinesPaneHeaders({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberEdited,
        vendorCode: testData.vendorCodeEdited,
      });
    },
  );
});
