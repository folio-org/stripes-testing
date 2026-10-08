import { Budgets } from '../../support/fragments/finance';
import { FUND_DISTRIBUTION_TYPES, INVOICE_STATUSES } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    fund: {},
    paidInvoice: {},
    approvedInvoice: {},
    csvFixtureName: 'file.csv',
    firstCsvDocumentName: `autotest_document_1_${randomPostfix}.csv`,
    secondCsvDocumentName: `autotest_document_2_${randomPostfix}.csv`,
    pngDocumentName: `autotest_document_${randomPostfix}.png`,
    // 1x1 pixel PNG image
    pngData:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    user: {},
  };

  const createFinanceData = () => {
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createInvoice = ({ invoiceKey, status }) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
      subTotal: 10,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      testData[invoiceKey] = invoice;

      return Invoices.changeInvoiceStatusViaApi({ invoice, status });
    });
  };

  const attachDocument = ({ invoiceKey, name, data }) => {
    return Invoices.createInvoiceDocumentViaApi({
      invoiceId: testData[invoiceKey].id,
      name,
      data,
    });
  };

  // Invoice #1 is paid and has two attached .csv files
  const createPaidInvoiceWithDocuments = () => {
    return createInvoice({ invoiceKey: 'paidInvoice', status: INVOICE_STATUSES.PAID })
      .then(() => cy.fixture(testData.csvFixtureName, 'base64'))
      .then((data) => {
        return attachDocument({
          invoiceKey: 'paidInvoice',
          name: testData.firstCsvDocumentName,
          data,
        }).then(() => attachDocument({
          invoiceKey: 'paidInvoice',
          name: testData.secondCsvDocumentName,
          data,
        }));
      });
  };

  // Invoice #2 is approved and has an attached .png file
  const createApprovedInvoiceWithDocument = () => {
    return createInvoice({
      invoiceKey: 'approvedInvoice',
      status: INVOICE_STATUSES.APPROVED,
    }).then(() => attachDocument({
      invoiceKey: 'approvedInvoice',
      name: testData.pngDocumentName,
      data: testData.pngData,
    }));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.then(createFinanceData)
      .then(createOrganization)
      .then(createPaidInvoiceWithDocuments)
      .then(createApprovedInvoiceWithDocument)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C360547 Remove attached files from approved and paid invoices (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C360547'] },
    () => {
      // Step 1: Click on Invoice #1
      Invoices.selectInvoiceByNumber(testData.paidInvoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkDocumentsSection({
        documentNames: [testData.firstCsvDocumentName, testData.secondCsvDocumentName],
      });

      // Step 2: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();

      // Steps 3-4: Remove both attached documents
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.deleteDocument(testData.firstCsvDocumentName);
      InvoiceEditForm.deleteDocument(testData.secondCsvDocumentName);

      // Step 5: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkDocumentsSection({ isEmpty: true });

      // Step 6: Open Invoice #2, click "Actions" button, select "Edit" option
      Invoices.selectInvoiceByNumber(testData.approvedInvoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkDocumentsSection({ documentNames: [testData.pngDocumentName] });
      InvoiceView.openInvoiceEditForm();

      // Step 7: Remove the attached document
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.deleteDocument(testData.pngDocumentName);

      // Step 8: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkDocumentsSection({ isEmpty: true });
    },
  );
});
