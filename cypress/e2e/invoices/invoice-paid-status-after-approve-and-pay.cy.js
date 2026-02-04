import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { Approvals } from '../../support/fragments/settings/invoices';
import InteractorsTools from '../../support/utils/interactorsTools';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: `account_C350620_${getRandomPostfix()}`,
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'autotest_account_1',
        notes: '',
        paymentMethod: 'EFT',
      },
    ],
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const invoiceLine = {
    description: `autotest description ${getRandomPostfix()}`,
    quantity: '1',
    subTotal: '10',
  };
  let user;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearResponse) => {
      defaultFiscalYear.id = fiscalYearResponse.id;
      defaultBudget.fiscalYearId = fiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;

          Budgets.createViaApi(defaultBudget).then((budgetResponse) => {
            defaultBudget.id = budgetResponse.id;

            Organizations.createOrganizationViaApi(organization).then((organizationResponse) => {
              organization.id = organizationResponse;
              invoice.vendorName = organization.name;
              invoice.accountingCode = organization.erpCode;

              cy.getBatchGroups().then((batchGroup) => {
                invoice.batchGroup = batchGroup.name;

                Approvals.setApprovePayValueViaApi(true);

                cy.createTempUser([
                  permissions.uiInvoicesApproveInvoices.gui,
                  permissions.viewEditCreateInvoiceInvoiceLine.gui,
                  permissions.uiInvoicesPayInvoices.gui,
                ]).then((userProperties) => {
                  user = userProperties;
                  cy.login(user.username, user.password, {
                    path: TopMenu.invoicesPath,
                    waiter: Invoices.waitLoading,
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
    // Budget, Fund, Ledger, and FiscalYear cannot be deleted because they have related transactions from paid invoice
  });

  it(
    'C350620 Invoice is in "Paid" status after "Approve & pay" (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350620'] },
    () => {
      Invoices.createDefaultInvoiceWithoutAddress(invoice);
      Invoices.checkCreatedInvoice(invoice);

      Invoices.createInvoiceLineWithFund(invoiceLine, defaultFund);

      Invoices.approveAndPayInvoice();
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceApprovedAndPaidMessage);

      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: 'Paid' }],
      });

      InvoiceView.checkInvoiceDetails({
        voucherInformation: [{ key: 'Status', value: 'Paid' }],
      });
    },
  );
});
