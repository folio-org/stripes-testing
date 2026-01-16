import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import DateTools from '../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../support/utils';

describe('Invoices', () => {
  const testData = {
    fiscalYearFirst: {},
    fiscalYearSecond: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    invoice: {},
    user: {},
  };

  const createFinanceData = () => {
    const code = CodeTools(4);
    const firstFY = {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    };
    const secondFY = {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    };

    return FiscalYears.createViaApi(firstFY).then((firstFYResponse) => {
      testData.fiscalYearFirst = firstFYResponse;

      return FiscalYears.createViaApi(secondFY).then((secondFYResponse) => {
        testData.fiscalYearSecond = secondFYResponse;

        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: firstFYResponse.id,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResponse.id,
          };

          return Funds.createViaApi(fund).then((fundResponse) => {
            testData.fund = fundResponse.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: firstFYResponse.id,
              fundId: fundResponse.fund.id,
              allocated: 1000,
            };

            return Budgets.createViaApi(budget).then((budgetResponse) => {
              testData.budget = budgetResponse;
            });
          });
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
          fiscalYearId: testData.fiscalYearSecond.id,
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
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYearFirst.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYearSecond.id);
    });
  });

  it(
    'C569568 Meaningful error message appears when trying to save invoice line with fund that has NO budget associated with the Fiscal year specified in the Invoice (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C569568'] },
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
        `Invoice line cannot be saved because Fund ${testData.fund.code} has no current budget for fiscal year ${testData.fiscalYearSecond.code}.`,
      );
      InvoiceLineEditForm.clickCancelButton('Close without saving');
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [],
      });
    },
  );
});
