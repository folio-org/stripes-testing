import { INVOICE_ACTION_MENU_BUTTONS, INVOICE_STATUSES } from '../../support/constants';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          invoiceStatus: INVOICE_STATUSES.OPEN,
        }).then((invoice) => {
          testData.invoice = invoice;
        });
      });
    });

    cy.createTempUser([Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C514953 User with insufficient permissions can not duplicate an invoice (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C514953'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.expandActionsDropdown();
      Invoices.checkActionPresentInList({
        actionName: INVOICE_ACTION_MENU_BUTTONS.EDIT,
        present: true,
      });
      Invoices.checkActionPresentInList({
        actionName: INVOICE_ACTION_MENU_BUTTONS.DUPLICATE,
        present: false,
      });
    },
  );
});
