import { Budgets } from '../../support/fragments/finance';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { INVOICE_STATUSES, INVOICE_VIEW_FIELDS } from '../../support/constants';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Permissions } from '../../support/dictionary';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    user: {},
  };

  before(() => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Invoices.createInvoiceWithInvoiceLineWithoutOrderViaApi({
          vendorId: testData.organization.id,
          fiscalYearId: testData.fiscalYear.id,
          accountingCode: testData.organization.erpCode,
          subTotal: 10,
          fundDistributions: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        }).then((invoice) => {
          testData.invoice = invoice;
          Invoices.changeInvoiceStatusViaApi({
            invoice: testData.invoice,
            status: INVOICE_STATUSES.APPROVED,
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C196779 Invoice: Pay invoices (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C196779', 'nonParallel'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
    },
  );
});
