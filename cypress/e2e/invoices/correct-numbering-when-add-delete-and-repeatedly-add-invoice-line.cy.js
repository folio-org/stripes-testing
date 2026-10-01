import {
  COMMON_BUTTON_LABELS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
} from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    invoice: {},
    duplicatedInvoice: {},
    vendorInvoiceNumberEdited: `AT_C389497_edited_${getRandomPostfix()}`,
    invoiceLine: {
      description: `AT_C389497_description_${getRandomPostfix()}`,
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

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createInvoiceWithLine = () => {
    return Invoices.createInvoiceWithInvoiceLineWithoutOrderViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      subTotal: 10,
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
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

  const addBlankInvoiceLine = () => {
    InvoiceView.openInvoiceLineEditForm();
    InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);
    InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
    InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);
    InvoiceLineEditForm.clickSaveButton();
    InvoiceView.waitLoading();
  };

  const deleteInvoiceLine = (rowIndex, invoiceLineNumber) => {
    InvoiceView.selectInvoiceLine(rowIndex);
    InvoiceLineDetails.deleteInvoiceLine(invoiceLineNumber);
    InvoiceView.waitLoading();
  };

  const checkInvoiceLinesNumbers = (lineNumbers) => {
    InvoiceView.checkInvoiceDetails({
      invoiceLines: lineNumbers.map((number) => ({ number })),
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization().then(createInvoiceWithLine).then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      if (testData.duplicatedInvoice.id) {
        Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
      }
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C389497 Correct numbering when add, delete, and repeatedly add invoice line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C389497'] },
    () => {
      // Step 1: Click on "Vendor invoice number" link for invoice from Preconditions
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ number: 1 }],
      });

      // Steps 2-4: Add new blank invoice line and check invoice line numbers
      addBlankInvoiceLine();
      checkInvoiceLinesNumbers([1, 2]);

      // Step 5: Click on invoice line #2 record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: 2,
        invoiceLineInformation: [{ key: INVOICE_LINE_VIEW_FIELDS.INVOICE_LINE_NUMBER, value: '2' }],
      });

      // Steps 6-7: Click "Actions" => "Delete" on "View invoice line - 2" pane => confirm deletion
      InvoiceLineDetails.deleteInvoiceLine(2);
      InvoiceView.waitLoading();
      checkInvoiceLinesNumbers([1]);

      // Steps 8-10: Add new blank invoice line, number "2" is not reused
      addBlankInvoiceLine();
      checkInvoiceLinesNumbers([1, 3]);

      // Step 11: Add one more blank invoice line
      addBlankInvoiceLine();
      checkInvoiceLinesNumbers([1, 3, 4]);

      // Step 12: Delete invoice line #3
      deleteInvoiceLine(1, 3);
      checkInvoiceLinesNumbers([1, 4]);

      // Step 13: Edit "Vendor invoice number" and save invoice
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ vendorInvoiceNo: testData.vendorInvoiceNumberEdited });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.vendorInvoiceNumberEdited,
        invoiceLines: [{ number: 1 }, { number: 4 }],
      });

      // Step 14: Delete invoice line #4
      deleteInvoiceLine(1, 4);
      checkInvoiceLinesNumbers([1]);

      // Step 15: Add new blank invoice line
      addBlankInvoiceLine();
      checkInvoiceLinesNumbers([1, 5]);

      // Step 16: Click "Actions" => "Duplicate" => "Duplicate" in "Duplicate invoice" modal
      Invoices.selectDuplicateInvoice();
      DuplicateInvoiceModal.clickDuplicateButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.vendorInvoiceNumberEdited,
        invoiceLines: [{ number: 1 }, { number: 2 }],
      });
      cy.url().then((url) => {
        testData.duplicatedInvoice.id = url.match(/invoice\/view\/([^/]+)/)?.[1] || null;
      });
    },
  );
});
