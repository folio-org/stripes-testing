import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { INVOICE_STATUSES } from '../../support/constants';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';

describe('Invoices', () => {
  const invoicesCount = 2;
  const testData = {
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    organization: NewOrganization.getDefaultOrganization(),
    orders: [],
    invoices: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fund = fund;
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      BatchGroups.createBatchGroupViaApi(testData.batchGroup);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        [...Array(invoicesCount).keys()].forEach(() => {
          const order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
            testData.orders.push(response);

            Orders.updateOrderViaApi({ ...response, workflowStatus: INVOICE_STATUSES.OPEN });
          });

          Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
          }).then((invoice) => {
            testData.invoices.push(invoice);
          });
        });
      });
    });

    cy.createTempUser([Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui]).then(
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
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    [...Array(invoicesCount).keys()].forEach((index) => {
      Invoices.deleteInvoiceViaApi(testData.invoices[index].id);
      Orders.deleteOrderViaApi(testData.orders[index].id);
    });
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    BatchGroups.deleteBatchGroupViaApi(testData.batchGroup.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C369085 Invoices | Results List | Verify that value in "Vendor invoice number" column is hyperlink (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C369085'] },
    () => {
      Invoices.selectStatusFilter(INVOICE_STATUSES.OPEN);
      InvoiceView.verifyInvoicesList();
      [...Array(invoicesCount).keys()].forEach((index) => {
        InvoiceView.verifyInvoiceLinkExists(testData.invoices[index].vendorInvoiceNo);

        InvoiceView.selectInvoiceLineByName(testData.invoices[index].vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
          vendorDetailsInformation: [
            { key: 'Vendor invoice number', value: testData.invoices[index].vendorInvoiceNo },
            { key: 'Vendor name', value: testData.organization.name },
            { key: 'Accounting code', value: testData.organization.erpCode },
          ],
        });
      });
    },
  );
});
