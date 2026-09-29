import {
  DEFAULT_WAIT_TIME,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  NO_VALUE,
  ROLLOVER_BUDGET_VALUE_AS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Duplicate invoice', () => {
    const code = CodeTools(4);
    const invoiceCurrency = { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' };

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      fund: {},
      invoice: {},
      invoiceLine: {},
      duplicatedInvoice: {},
      documentFileName: 'file.csv',
      exchangeRate: 15,
      locale: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYears.first.id,
        restrictExpenditures: true,
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
            fiscalYearId: testData.fiscalYears.first.id,
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

    const createInvoiceWithLineInForeignCurrency = () => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYears.first.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        currency: invoiceCurrency.code,
        exchangeRate: testData.exchangeRate,
        fundDistributions: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        subTotal: 5,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    };

    const attachDocumentToInvoice = () => {
      return cy.fixture(testData.documentFileName, 'base64').then((data) => {
        return Invoices.createInvoiceDocumentViaApi({
          invoiceId: testData.invoice.id,
          name: testData.documentFileName,
          data,
        });
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

    const getInvoiceLine = () => {
      return InvoiceLineDetails.getInvoiceLinesViaApi({
        query: `invoiceId==${testData.invoice.id}`,
      }).then(({ invoiceLines }) => {
        testData.invoiceLine = invoiceLines[0];
      });
    };

    const rolloverToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
          encumbrancesRollover: [],
        }),
      );
    };

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDates = () => {
      return updateFiscalYearDates('first', -1).then(() => updateFiscalYearDates('second', 0));
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

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(createFundWithBudget)
        .then(createOrganization)
        .then(createInvoiceWithLineInForeignCurrency)
        .then(attachDocumentToInvoice)
        .then(approveInvoice)
        .then(payInvoice)
        .then(getInvoiceLine)
        .then(rolloverToSecondFiscalYear)
        .then(shiftFiscalYearDates)
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
      'C514955 Duplicate invoice in "Paid" status with exchange rate manually set and one invoice line not related to POL (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C514955'] },
      () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();

        // Step 1: Open the "Duplicate" confirmation modal
        Invoices.selectDuplicateInvoice();

        // Step 2: Duplicate the invoice
        Invoices.interceptPostInvoices();
        DuplicateInvoiceModal.clickDuplicateButton();

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

        InvoiceView.waitLoading();

        // Step 3: Check the data of the duplicated invoice, the fiscal year is changed to the current one
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: INVOICE_VIEW_FIELDS.APPROVED_DATE, value: NO_VALUE },
            { key: INVOICE_VIEW_FIELDS.APPROVED_BY, value: NO_VALUE },
            { key: INVOICE_VIEW_FIELDS.PAYMENT_DATE, value: NO_VALUE },
            {
              key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
              value: `${invoiceCurrency.symbol}${testData.invoiceLine.subTotal}.00`,
            },
            {
              key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
              value: `${testData.invoiceLine.subTotal * testData.exchangeRate}.00`,
            },
          ],
          invoiceLines: [{ number: 1, description: testData.invoiceLine.description }],
          vendorDetailsInformation: [
            { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
          ],
        });
        InvoiceView.expandExtendedInformationAccordion();
        InvoiceView.checkInvoiceDetails({
          extendedInformation: [
            { key: INVOICE_VIEW_FIELDS.CURRENCY, value: invoiceCurrency.name },
            { key: INVOICE_VIEW_FIELDS.EXCHANGE_RATE, value: String(testData.exchangeRate) },
          ],
        });
        // The linked document is not duplicated
        InvoiceView.expandLinksDocumentsAccordion();
        InvoiceView.checkDocumentsSection({ shouldExpand: false, isEmpty: true });
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

        // Step 4: Open the duplicated invoice line
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            {
              key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
              value: testData.invoiceLine.description,
            },
            { key: INVOICE_LINE_VIEW_FIELDS.QUANTITY, value: testData.invoiceLine.quantity },
            {
              key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL,
              value: `${invoiceCurrency.symbol}${testData.invoiceLine.subTotal}.00`,
            },
            {
              key: INVOICE_LINE_VIEW_FIELDS.TOTAL_EXCHANGED,
              value: `${testData.invoiceLine.subTotal * testData.exchangeRate}.00`,
            },
          ],
          checkboxes: [
            {
              locator: { labelText: INVOICE_LINE_VIEW_FIELDS.RELEASE_ENCUMBRANCE },
              conditions: { disabled: true, checked: true },
            },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.name }]);
      },
    );
  });
});
