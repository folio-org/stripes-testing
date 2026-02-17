import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Invoices', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    organization: {},
    invoice: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;
        });
      });
    });
  };

  const createInvoice = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return cy.getBatchGroups().then((batchGroup) => {
        return Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          fiscalYearId: testData.fiscalYear.id,
          batchGroupId: batchGroup.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoiceResponse) => {
          testData.invoice = invoiceResponse;
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createInvoice().then(() => {
        cy.createTempUser([permissions.viewEditCreateInvoiceInvoiceLine.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.invoicesPath,
              waiter: Invoices.waitLoading,
            });
          },
        );
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C569566 Meaningful error message appears when trying to save invoice line with fund that has NO budget (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C569566'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: 'Open' }],
      });
      InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: 'Test invoice line',
        quantity: '1',
        subTotal: '100',
      });
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.clickSaveButton({ invoiceLineSaved: false });
      InteractorsTools.checkCalloutErrorMessage(
        `Invoice line cannot be saved because Fund ${testData.fund.code} has no current budget for fiscal year ${testData.fiscalYear.code}.`,
      );
      InvoiceLineEditForm.clickCancelButton('Close without saving');
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [],
      });
    },
  );
});
