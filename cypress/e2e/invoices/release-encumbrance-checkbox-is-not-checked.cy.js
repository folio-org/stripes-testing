import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Invoices, InvoiceView, InvoiceLineDetails } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

          Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
          }).then((invoice) => {
            testData.invoice = invoice;
          });
        });
      });
    });

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C389582 "Release encumbrance" checkbox is NOT checked after creating new blank invoice line (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // Open invoice by clicking on its "Vendor invoice number" link on "Invoices" pane
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Status', value: INVOICE_STATUSES.OPEN },
          { key: 'Fiscal year', value: 'No value set' },
        ],
      });

      // Click "Actions" button in "Invoice lines" accordion, Select "New blank line" option
      const InvoiceLineEditForm = InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions([
        {
          label: 'Release encumbrance',
          conditions: { checked: false },
        },
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Click "POL look-up" link, Search for PO line
      InvoiceLineEditForm.selectOrderLines(testData.orderLine.titleOrPackage);
      InvoiceLineEditForm.checkButtonsConditions([
        {
          label: 'Release encumbrance',
          conditions: { checked: false },
        },
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkTableContent([
        {
          poNumber: testData.order.poNumber,
          description: testData.orderLine.titleOrPackage,
        },
      ]);

      // Click on created invoice line
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: 'Description', value: testData.orderLine.titleOrPackage },
          { key: 'Status', value: INVOICE_STATUSES.OPEN },
        ],
        checkboxes: [
          {
            locator: { labelText: 'Release encumbrance' },
            conditions: { disabled: true, checked: false },
          },
        ],
      });
    },
  );
});
