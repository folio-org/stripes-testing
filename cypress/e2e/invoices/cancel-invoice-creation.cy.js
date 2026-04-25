import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  let user;

  before(() => {
    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C710370 Cancel invoice creation (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C710370'] },
    () => {
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.fillInvoiceFields({
        status: INVOICE_STATUSES.REVIEWED,
      });
      InvoiceEditForm.waitLoading(1000);
      InvoiceEditForm.cancelWithUnsavedChanges();
      Invoices.waitLoading();
    },
  );
});
