import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import { INVOICE_STATUSES, INVOICE_VIEW_FIELDS } from '../../support/constants';

describe('Invoices', () => {
  const code = CodeTools(4);
  const testData = {
    fiscalYear: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    },
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    invoice: {},
    duplicatedInvoice: {},
    user: {},
    locale: 'en-US',
    timezone: 'UTC',
  };

  const createInvoice = (batchGroupId) => {
    return Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      batchGroupId,
      invoiceStatus: INVOICE_STATUSES.OPEN,
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  const updateFiscalYearToPast = () => {
    return FiscalYears.updateFiscalYearViaApi({
      ...testData.fiscalYear,
      _version: 1,
      ...DateTools.getFullFiscalYearStartAndEnd(-1),
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale.locale || 'en-US';
      testData.timezone = locale.timezone || 'UTC';
    });

    return FiscalYears.createViaApi(testData.fiscalYear)
      .then((fiscalYear) => {
        testData.fiscalYear.id = fiscalYear.id;
        return Organizations.createOrganizationViaApi(testData.organization);
      })
      .then((organizationId) => {
        testData.organization.id = organizationId;
        return cy.getBatchGroups();
      })
      .then((batchGroup) => {
        return createInvoice(batchGroup.id);
      })
      .then(() => updateFiscalYearToPast())
      .then(() => {
        return cy
          .createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui])
          .then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.invoicesPath,
              waiter: Invoices.waitLoading,
            });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      if (testData.duplicatedInvoice?.id) {
        Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
      }
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C514954 Duplicate invoice in "Open" status with no invoice lines (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C514954'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectDuplicateInvoice();
      DuplicateInvoiceModal.verifyModalView();
      DuplicateInvoiceModal.closeModal();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      Invoices.selectDuplicateInvoice();

      const currentDate = DateTools.getFormattedDateTimeInTimezoneForMetadata(
        new Date(),
        testData.timezone,
        testData.locale,
      );

      DuplicateInvoiceModal.clickDuplicateButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: '-' },
        ],
        vendorDetailsInformation: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
        ],
      });
      cy.url().then((url) => {
        testData.duplicatedInvoice.id = url.match(/invoice\/view\/([^/]+)/)?.[1] || null;
      });
      InvoiceView.toggleMetadataAccordion();
      InvoiceView.verifyMetadataContent({
        updated: currentDate,
        updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
        created: currentDate,
        createdBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
      });
    },
  );
});
