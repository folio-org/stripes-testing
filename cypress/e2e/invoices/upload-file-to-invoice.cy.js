import { Permissions } from '../../support/dictionary';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {
    invoice: {},
    organization: NewOrganization.getDefaultOrganization(),
  };
  const fileName = `File ${getRandomPostfix()}`;
  const linkName = 'Sample link';
  const linkExample = 'https://example.com';

  before('Create test data and preconditions', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      cy.getBatchGroups().then(({ id: batchGroupId, name: batchGroupName }) => {
        testData.invoice = Invoices.getDefaultInvoice({
          batchGroupId,
          batchGroupName,
          vendorId: testData.organization.id,
          vendorName: testData.organization.name,
          accountingCode: testData.organization.erpCode,
          invoiceDate: DateTools.getCurrentDate(),
        });
      });
    });
    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((user) => {
      testData.user = user;
      cy.loginAsAdmin({
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
      FileManager.createFile(`cypress/fixtures/${fileName}`, 'someContent');
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.user.userId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    FileManager.deleteFileFromDownloadsByMask(fileName);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C15856 Upload file to invoice (thunderjet) (TaaS)',
    {
      tags: ['criticalPath', 'thunderjet', 'C15856'],
    },
    () => {
      // Create an invoice
      const InvoiceEditForm = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);
      // Populate required fields and add file
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        status: testData.invoice.status,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.invoice.vendorName,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.uploadFile(fileName);
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: false } },
        { label: 'Delete', conditions: { disabled: false } },
      ]);
      // Add link
      InvoiceEditForm.addLinkToInvoice(linkName, linkExample);
      // Click "Save & close" button on "Create vendor invoice" form
      InvoiceEditForm.clickSaveButton();
      // Expand "Links & documents" accordion on created invoice pane
      InvoiceView.checkDocumentsSection({ linkName, linkExample, fileName });
      InvoiceView.downloadDocument();
      FileManager.verifyFileIncludes(fileName, [], true);
    },
  );
});
