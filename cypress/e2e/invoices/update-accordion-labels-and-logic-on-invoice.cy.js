import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const allocatedQuantity = '100';
  defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
  const adjustmentDescription = `test_description${getRandomPostfix()}`;
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });

        cy.getAdminToken();
        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
          invoice.accountingCode = organization.erpCode;
          cy.getBatchGroups().then((batchGroup) => {
            invoice.batchGroup = batchGroup.name;
          });
        });
        TopMenuNavigation.openAppFromDropdown('Invoices');
        Invoices.createRolloverInvoiceWithFY(invoice, organization.name, defaultFiscalYear);
        Invoices.createInvoiceLine(invoiceLine);
      });
    });

    cy.createTempUser([permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${invoice.invoiceNumber}"`,
    }).then(({ invoices }) => {
      Invoices.deleteInvoiceViaApi(invoices[0].id);
    });
  });

  it(
    'C350937 Update accordion labels and logic on Invoice (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350937'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkFundListIsEmpty();
      InvoiceLineDetails.checkAdjustmentsListIsEmpty();
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      Invoices.editInvoice();
      Invoices.addAdjustmentToInvoice(
        adjustmentDescription,
        '10',
        '$',
        'By line',
        'In addition to',
      );
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.addFundToLine(defaultFund);
    },
  );
});
