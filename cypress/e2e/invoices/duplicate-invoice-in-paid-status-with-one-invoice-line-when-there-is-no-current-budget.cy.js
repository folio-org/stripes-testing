import { calloutTypes } from '../../../interactors';
import {
  DEFAULT_WAIT_TIME,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  NO_VALUE,
} from '../../support/constants';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Duplicate invoice', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `autotest_year_${getRandomPostfix()}`,
        code: `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      ledger: {},
      fund: {},
      invoice: {},
      duplicatedInvoice: {},
      locale: {},
      user: {},
    };

    const createFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYear) => {
        testData.fiscalYear = fiscalYear;
      });
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYear.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = () => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id }).then(
        (fundResponse) => {
          testData.fund = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: testData.fund.id,
            allocated: 100,
          });
        },
      );
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const createInvoiceWithNegativeLine = () => {
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
        subTotal: -15,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    };

    const approveInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.APPROVED,
      });
    };

    const payInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.PAID,
      });
    };

    const moveFiscalYearToThePast = () => {
      return FiscalYears.updateFiscalYearViaApi({
        ...testData.fiscalYear,
        ...DateTools.getFullFiscalYearStartAndEnd(-1),
      });
    };

    const getTenantLocale = () => {
      return cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui])
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

      createFiscalYear()
        .then(createLedger)
        .then(createFundWithBudget)
        .then(createOrganization)
        .then(createInvoiceWithNegativeLine)
        .then(approveInvoice)
        .then(payInvoice)
        .then(moveFiscalYearToThePast)
        .then(getTenantLocale)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        if (testData.duplicatedInvoice?.id) {
          Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
        }
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C514959 Duplicate invoice in "Paid" status with one invoice line, when there is no current budget (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C514959'] },
      () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();

        // Step 1: Open the "Duplicate" confirmation modal
        Invoices.selectDuplicateInvoice();

        // Step 2: Duplicate the invoice, the invoice line is not duplicated without the fiscal year
        Invoices.interceptPostInvoices();
        DuplicateInvoiceModal.clickDuplicateButton(false);

        let recordCreatedDate;
        Invoices.waitForInvoicesPostQueryCompleted().then(({ response: { body } }) => {
          const currentDate = new Date();
          recordCreatedDate = new Date(body.metadata.createdDate);
          testData.duplicatedInvoice.id = body.id;

          // Verify that the created date is close to the current date
          // Allowing for a small difference due to processing time
          // We must check actual time difference because the created date is generated on the server side
          // That's why we cant just check for equality, we need to check that it is close enough to the current date
          expect(recordCreatedDate.getTime()).to.be.closeTo(
            currentDate.getTime(),
            DEFAULT_WAIT_TIME,
          );
        });
        InteractorsTools.assertCalloutsBatch([
          { message: InvoiceStates.saveLineErrorBudgetNotFoundByFundId, type: calloutTypes.error },
          { message: InvoiceStates.invoiceDuplicatedMessage, type: calloutTypes.success },
        ]);
        InvoiceView.waitLoading();

        // Step 3: Check the data of the duplicated invoice
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$0.00' },
            { key: INVOICE_VIEW_FIELDS.PAYMENT_DATE, value: NO_VALUE },
          ],
          invoiceLines: [],
          vendorDetailsInformation: [
            { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
          ],
        });
        // The voucher is not duplicated
        InvoiceView.verifyVoucherAccordionAbsent();
        cy.then(() => {
          InvoiceView.toggleMetadataAccordion();
          InvoiceView.verifyMetadataContent({
            created: DateTools.getFormattedDateTimeInTimezoneForMetadata(
              recordCreatedDate,
              testData.locale.timezone,
              testData.locale.locale,
            ),
            createdBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
          });
        });
      },
    );
  });
});
