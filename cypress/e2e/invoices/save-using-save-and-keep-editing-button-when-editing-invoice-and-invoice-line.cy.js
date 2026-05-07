import {
  INVOICE_AND_INVOICE_LINE_BUTTONS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import dateTools from '../../support/utils/dateTools';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    invoiceNumbers: {
      vendorInvoiceNumberFirst: `autotest_first${getRandomPostfix()}`,
      vendorInvoiceNumberSecond: `autotest_second_${getRandomPostfix()}`,
    },
    invoice: {},
    invoiceLineDescriptions: {
      descriptionFirst: `autotest_description_first_${getRandomPostfix()}`,
      descriptionSecond: `autotest_description_second_${getRandomPostfix()}`,
    },
    invoiceLine: {},
    user: {},
    adminUser: {},
    locale: 'en-US',
    timezone: 'UTC',
  };

  const buttonConditions = {
    saveCloseEnabled: [
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.CANCEL, conditions: { disabled: false } },
      {
        label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_KEEP_EDITING,
        conditions: { disabled: false },
      },
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_CLOSE, conditions: { disabled: false } },
    ],
    saveCloseDisabled: [
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.CANCEL, conditions: { disabled: false } },
      {
        label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_KEEP_EDITING,
        conditions: { disabled: true },
      },
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_CLOSE, conditions: { disabled: true } },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.setDefaultLocaleApi();
      cy.getAdminUserDetails().then((adminUser) => {
        testData.adminUser = adminUser;
      });

      Organizations.createOrganizationViaApi(testData.organization)
        .then((organizationId) => {
          testData.organization.id = organizationId;

          return cy.getBatchGroups();
        })
        .then(({ id: batchGroupId }) => {
          return Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            vendorInvoiceNo: testData.invoice.vendorInvoiceNumberFirst,
            batchGroupId,
            accountingCode: testData.organization.erpCode,
          });
        })
        .then((invoice) => {
          testData.invoice = invoice;

          return Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              description: testData.invoiceLineDescriptions.descriptionFirst,
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              subTotal: 20,
            }),
          ).then((invoiceLine) => {
            testData.invoiceLine = invoiceLine;
          });
        });

      cy.createTempUser([Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        },
      );
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C663271 Save using "Save & keep editing" button when editing invoice and invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C663271'] },
    () => {
      // Step 1: Search for the invoice
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();

      // Step 2: Open invoice edit form and check buttons conditions
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 3: Clear required field and check buttons conditions
      InvoiceEditForm.clearField(INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER);
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 4: Click "Save & keep editing" button and check that validation error is shown
      InvoiceEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      InvoiceEditForm.checkRequiredFields([INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER]);

      // Step 5: Fill required fields and check buttons conditions
      InvoiceEditForm.fillInvoiceFields({
        vendorInvoiceNo: testData.invoiceNumbers.vendorInvoiceNumberSecond,
      });
      InvoiceEditForm.clickSaveAndKeepEditingButton();
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 6: Make changes and check buttons conditions
      InvoiceEditForm.fillInvoiceFields({
        vendorInvoiceNo: testData.invoiceNumbers.vendorInvoiceNumberFirst,
      });
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 7: Click "Save & keep editing" button and check buttons conditions
      InvoiceEditForm.clickSaveAndKeepEditingButton();

      Invoices.getInvoiceViaApi({ query: `id==${testData.invoice.id}` }).then(({ invoices }) => {
        testData.invoice.updatedDate = invoices[0].metadata.updatedDate;
        testData.invoice.createdDate = invoices[0].metadata.createdDate;

        InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

        // Wait to ensure that updatedDate is saved for the last edit
        cy.wait(60000).then(() => {
          // Step 8: Make changes and Close without saving, check metadata
          InvoiceEditForm.fillInvoiceFields({
            vendorInvoiceNo: testData.invoiceNumbers.vendorInvoiceNumberSecond,
          });
          InvoiceEditForm.cancelWithUnsavedChanges({ shouldShowInvoiceDetails: true });
          InvoiceView.waitLoading();
          InvoiceView.checkInvoiceDetails({
            title: testData.invoiceNumbers.vendorInvoiceNumberFirst,
          });
          InvoiceView.toggleMetadataAccordion();
          InvoiceView.verifyMetadataContent({
            updated: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.invoice.updatedDate,
              testData.timezone,
              testData.locale,
            ),
            updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
            created: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.invoice.createdDate,
              testData.timezone,
              testData.locale,
            ),
            createdBy: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
          });
        });
      });

      // Step 9: Open invoice line
      InvoiceView.selectInvoiceLine();

      // Step 10: Open invoice line edit form and check buttons conditions
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 11: Clear required field and check buttons conditions
      InvoiceLineEditForm.clearField(INVOICE_LINE_VIEW_FIELDS.DESCRIPTION);
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 12: Click "Save & keep editing" button and check that validation error is shown
      InvoiceLineEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      InvoiceLineEditForm.checkRequiredFields([INVOICE_LINE_VIEW_FIELDS.DESCRIPTION]);

      // Step 13: Fill required fields and click "Save & keep editing" button
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLineDescriptions.descriptionSecond,
      });
      InvoiceLineEditForm.clickSaveAndKeepEditingButton();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 14: Make changes and check buttons conditions
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLineDescriptions.descriptionFirst,
      });
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 15: click "Save & keep editing" button and check buttons conditions
      InvoiceLineEditForm.clickSaveAndKeepEditingButton();

      InvoiceLineDetails.getInvoiceLinesViaApi({ query: `id==${testData.invoiceLine.id}` }).then(
        ({ invoiceLines }) => {
          testData.invoiceLine.updatedDate = invoiceLines[0].metadata.updatedDate;
          testData.invoiceLine.createdDate = invoiceLines[0].metadata.createdDate;

          InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

          // Wait to ensure that updatedDate is saved for the last edit
          cy.wait(60000).then(() => {
            // Step 16: Make changes and Close without saving
            InvoiceLineEditForm.fillInvoiceLineFields({
              description: testData.invoiceLineDescriptions.descriptionSecond,
            });
            InvoiceLineEditForm.cancelWithUnsavedChanges();
            InvoiceView.waitLoading();
            InvoiceView.checkInvoiceDetails({
              invoiceLine: [
                {
                  key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
                  value: testData.invoiceLineDescriptions.descriptionFirst,
                },
              ],
            });

            // Step 17: Check created invoice line details and metadata
            InvoiceView.selectInvoiceLine();
            InvoiceLineDetails.waitLoading();
            InvoiceLineDetails.toggleMetadataAccordion();
            InvoiceLineDetails.verifyMetadataContent({
              updated: dateTools.getFormattedDateTimeInTimezoneForMetadata(
                testData.invoiceLine.updatedDate,
                testData.timezone,
                testData.locale,
              ),
              updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
              created: dateTools.getFormattedDateTimeInTimezoneForMetadata(
                testData.invoiceLine.createdDate,
                testData.timezone,
                testData.locale,
              ),
              createdBy: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
            });
          });
        },
      );
    },
  );
});
