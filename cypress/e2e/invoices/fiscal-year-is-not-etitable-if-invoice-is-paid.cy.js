import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import InteractorsTools from '../../support/utils/interactorsTools';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    user: {},
  };
  const status = INVOICE_STATUSES.PAID;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: '100' },
      });
      testData.fund = fund;
      testData.ledger = ledger;
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 100,
          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (resp) => {
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: orderLine.id,
                fundDistributions: resp[0].fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: true,
              }).then((invoice) => {
                testData.invoice = invoice;

                Invoices.changeInvoiceStatusViaApi({ invoice: testData.invoice, status });
              });
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C387536 "Fiscal year" field is not editable for paid invoice (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Status', value: status },
          { key: 'Fiscal year', value: testData.fiscalYear.code },
        ],
      });

      const InvoiceEditForm = Invoices.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        {
          label: 'Fiscal year',
          conditions: { disabled: true, singleValue: testData.fiscalYear.code },
        },
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      InvoiceEditForm.fillInvoiceFields({ note: 'some note value' });
      InvoiceEditForm.clickSaveButton();

      InteractorsTools.checkCalloutMessage('Invoice has been saved');
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Status', value: status },
          { key: 'Fiscal year', value: testData.fiscalYear.code },
        ],
      });
    },
  );
});
