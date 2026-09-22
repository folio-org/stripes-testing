import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_ACTION_MENU_BUTTONS,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORGANIZATION_DETAILS_FIELDS,
  ORGANIZATION_SEARCH_OPTIONS,
  ORGANIZATION_STATUSES,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import { DateTools } from '../../support/utils';
import { InvoiceEditForm, InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  NewOrganization,
  OrganizationDetails,
  Organizations,
} from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import { Approvals } from '../../support/fragments/settings/invoices';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    order: {},
    orderLine: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumber: `AT_C388558_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
    user: {},
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

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
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
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: testData.order.id,
            title: `AT_C388558_orderLine_${getRandomPostfix()}`,
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
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
  };

  const changeOrganizationStatus = ({ from, to }) => {
    Organizations.editOrganization();
    Organizations.checkOrganizationStatusInEditForm(from);
    Organizations.changeOrganizationStatus(to);
    OrganizationDetails.checkOrganizationDetails([
      { key: ORGANIZATION_DETAILS_FIELDS.ORGANIZATION_STATUS, value: to },
    ]);
  };

  const checkInvoiceVendorDetails = ({ isVendorInactive }) => {
    InvoiceView.checkInvoiceDetails({
      title: testData.invoice.vendorInvoiceNumber,
      vendorDetails: [{ key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name }],
    });

    if (isVendorInactive) {
      InvoiceView.checkInvoiceCanNotBeApprovedWarning(
        InvoiceStates.invoiceCanNotBeApprovedInactiveOrganization,
      );
    } else {
      InvoiceView.checkInvoiceWarningAbsent(
        InvoiceStates.invoiceCanNotBeApprovedInactiveOrganization,
      );
    }
  };

  const checkInvoiceActionsMenu = (buttons) => {
    InvoiceView.expandActionsDropdown();
    InvoiceView.checkActionButtonsConditions(buttons);
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    createFiscalYearLedgerFundAndBudget()
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOpenOrderWithLine)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C388558 User is not able to approve invoice against inactive organization ("Approve and pay in one click" setting is disabled) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C388558', 'nonParallel'] },
    () => {
      // Step 1: Click organization name in "Name" column in "Organizations" pane
      OrganizationsSearchAndFilter.searchByParameters(
        ORGANIZATION_SEARCH_OPTIONS.NAME,
        testData.organization.name,
      );
      Organizations.selectOrganization(testData.organization.name);

      // Steps 2-3: Change "Organization status" from "Active" to "Inactive"
      changeOrganizationStatus({
        from: ORGANIZATION_STATUSES.ACTIVE,
        to: ORGANIZATION_STATUSES.INACTIVE,
      });

      // Steps 4-5: Open Order from Preconditions in "Orders" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 6: Click "Actions" => "New invoice" => "Submit" in "Create invoice" modal
      OrderDetails.createNewInvoice();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkButtonsConditions([
        {
          label: INVOICE_VIEW_FIELDS.VENDOR_NAME,
          conditions: { disabled: true, value: testData.organization.name },
        },
      ]);

      // Step 7: Fill in required invoice fields
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroup,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumber,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 8: Click "Save & close" button
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });
      InvoiceView.waitLoading();
      checkInvoiceVendorDetails({ isVendorInactive: true });

      // Step 9: Click "Actions" menu button in "Vendor invoice number - <number>" pane
      checkInvoiceActionsMenu([
        { label: INVOICE_ACTION_MENU_BUTTONS.EDIT, conditions: { disabled: false } },
        { label: INVOICE_ACTION_MENU_BUTTONS.APPROVE, conditions: { disabled: true } },
        { label: INVOICE_ACTION_MENU_BUTTONS.DELETE, conditions: { disabled: false } },
      ]);

      // Steps 10-12: Open organization from "Vendor name" link and change status to "Active"
      Invoices.clickOnOrganizationFromInvoice(testData.organization.name);
      OrganizationDetails.waitLoading();
      changeOrganizationStatus({
        from: ORGANIZATION_STATUSES.INACTIVE,
        to: ORGANIZATION_STATUSES.ACTIVE,
      });

      // Step 13: Click "Invoices" button in the header
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      InvoiceView.waitLoading();
      checkInvoiceVendorDetails({ isVendorInactive: false });

      // Step 14: Approve invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Steps 15-17: Open organization from "Vendor name" link and change status to "Inactive"
      Invoices.clickOnOrganizationFromInvoice(testData.organization.name);
      OrganizationDetails.waitLoading();
      changeOrganizationStatus({
        from: ORGANIZATION_STATUSES.ACTIVE,
        to: ORGANIZATION_STATUSES.INACTIVE,
      });

      // Step 18: Click "Invoices" button in the header
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      InvoiceView.waitLoading();
      checkInvoiceVendorDetails({ isVendorInactive: true });

      // Step 19: Click "Actions" menu button in "Vendor invoice number - <number>" pane
      checkInvoiceActionsMenu([
        { label: INVOICE_ACTION_MENU_BUTTONS.EDIT, conditions: { disabled: false } },
        { label: INVOICE_ACTION_MENU_BUTTONS.PAY, conditions: { disabled: true } },
        { label: INVOICE_ACTION_MENU_BUTTONS.PRINT_VOUCHER, conditions: { disabled: false } },
        { label: INVOICE_ACTION_MENU_BUTTONS.CANCEL, conditions: { disabled: false } },
      ]);

      // Step 20: Cancel invoice
      InvoiceView.expandActionsDropdown();
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      checkInvoiceVendorDetails({ isVendorInactive: true });
    },
  );
});
