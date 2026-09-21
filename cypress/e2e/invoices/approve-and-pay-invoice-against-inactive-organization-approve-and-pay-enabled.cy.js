import {
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  INVOICE_ACTION_MENU_BUTTONS,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORGANIZATION_DETAILS_FIELDS,
  ORGANIZATION_STATUSES,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceEditForm, InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import {
  NewOrganization,
  OrganizationDetails,
  Organizations,
} from '../../support/fragments/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { DateTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      status: ORGANIZATION_STATUSES.INACTIVE,
    },
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumber: `AT_C388559_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
    invoiceLine: {
      description: `AT_C388559_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '10',
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

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
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
    Approvals.setApprovePayValueViaApi(true);

    createFiscalYearLedgerFundAndBudget().then(createOrganization).then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C388559 User is not able to approve and pay invoice against inactive organization ("Approve and pay in one click" setting is enabled) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C388559', 'nonParallel'] },
    () => {
      // Step 1: Click "Actions" menu button in the "Invoices" main pane => select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();

      // Step 2: Fill in required invoice fields, select inactive vendor via "Organization look-up"
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroup,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumber,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 3: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      checkInvoiceVendorDetails({ isVendorInactive: true });

      // Step 4: Click "Actions" menu button in "Vendor invoice number - <number>" pane
      checkInvoiceActionsMenu([
        { label: INVOICE_ACTION_MENU_BUTTONS.EDIT, conditions: { disabled: false } },
        { label: INVOICE_ACTION_MENU_BUTTONS.DELETE, conditions: { disabled: false } },
      ]);

      // Step 5: Click "Actions" menu button in "Invoice lines" accordion => select "New blank line" option
      InvoiceView.openInvoiceLineEditForm();

      // Step 6: Fill in "Description", "Quantity", "Sub-total" fields
      InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 7: Click "Add fund distribution" button => Select "Fund A" in "Fund ID" dropdown
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 8: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [{ description: testData.invoiceLine.description }],
      });
      checkInvoiceVendorDetails({ isVendorInactive: true });

      // Step 9: Click "Actions" menu button in "Vendor invoice number - <number>" pane
      checkInvoiceActionsMenu([
        { label: INVOICE_ACTION_MENU_BUTTONS.EDIT, conditions: { disabled: false } },
        { label: INVOICE_ACTION_MENU_BUTTONS.APPROVE_AND_PAY, conditions: { disabled: true } },
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

      // Step 14: Approve & pay invoice
      InvoiceView.approveInvoice({ isApprovePayEnabled: true });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
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
