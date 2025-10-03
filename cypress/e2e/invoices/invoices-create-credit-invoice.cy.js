import Helper from '../../support/fragments/finance/financeHelper';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import TopMenu from '../../support/fragments/topMenu';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const subtotalValue = 100;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
    Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
      (organization) => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(
          vendorPrimaryAddress,
          organization.addresses.find((address) => address.isPrimary === true),
        );
      },
    );
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);
        });
      });
    });
    invoiceLine.subTotal = -subtotalValue;
    cy.loginAsAdmin({
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
  });

  it(
    'C343209 Create, approve and pay a credit invoice (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft'] },
    () => {
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
      Invoices.createInvoiceLine(invoiceLine);
      cy.intercept(
        {
          method: 'GET',
          url: '**/finance/funds*',
        },
        { body: { funds: [defaultFund], totalRecords: 1 } },
      ).as('stubFundsFilter');
      Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
      cy.wait('@stubFundsFilter');
      Approvals.setApprovePayValue(false);
      cy.wait(4000);
      Invoices.approveInvoice();
      // check transactions after approve
      TopMenuNavigation.openAppFromDropdown('Finance');
      Helper.selectFundsNavigation();
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.openBudgetDetailsByBudgetName(defaultBudget);
      Funds.openTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$100.00',
        invoice.invoiceNumber,
        'Pending payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionDetails();
      // pay invoice
      TopMenuNavigation.openAppFromDropdown('Invoices');
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Approvals.setApprovePayValue(false);
      Invoices.payInvoice();
      // check transactions after payment
      TopMenuNavigation.openAppFromDropdown('Finance');
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        defaultFiscalYear.code,
        '$100.00',
        invoice.invoiceNumber,
        'Credit',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
