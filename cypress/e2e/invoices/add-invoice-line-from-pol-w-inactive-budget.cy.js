import { Permissions } from '../../support/dictionary';
import { NewInvoice, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { NewOrder, Orders, BasicOrderLine } from '../../support/fragments/orders';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    invoice: {
      ...NewInvoice.defaultUiInvoice,
      accountingCode: organization.erpCode,
      vendorName: organization.name,
    },
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({});
      testData.budget = budget;
      testData.fund = fund;
      testData.fiscalYear = fiscalYear;

      Organizations.createOrganizationViaApi(testData.organization)
        .then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 50,
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

              BatchGroups.createBatchGroupViaApi(testData.batchGroup).then((batchGroup) => {
                testData.invoice.batchGroup = batchGroup.name;
              });
            },
          );
        })
        .then(() => {
          Budgets.getBudgetByIdViaApi(testData.budget.id).then((resp) => {
            Budgets.updateBudgetViaApi({ ...resp, budgetStatus: 'Closed' });
          });
        });
    });

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353572 Saving invoice line from POL with inactive budget (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353572'] },
    () => {
      // Click "Actions" button, Select "New" option
      // Fill in all the required fields with valid data, Click "Save" button
      Invoices.createSpecialInvoice(testData.invoice);

      // Click "Actions" button, Select "Add line from POL" option
      const SelectOrderLinesModal = InvoiceView.openSelectOrderLineModal();

      // Search for the POL, Select it by checking checkbox in "Order lines" pane, Click "Save" button
      SelectOrderLinesModal.selectOrderLine(testData.order.poNumber);

      // Created invoice line is displayed in "Invoice lines" accordion
      InvoiceView.checkInvoiceLinesTableContent([
        {
          poNumber: testData.order.poNumber,
          description: testData.orderLine.titleOrPackage,
        },
      ]);
    },
  );
});
