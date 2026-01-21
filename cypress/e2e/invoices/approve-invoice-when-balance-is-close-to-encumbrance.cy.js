import { INVOICE_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (orderLines) => {
              testData.orderLine = orderLines[0];

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: true,
              }).then((invoice) => {
                testData.invoice = invoice;
              });
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
      });
      SettingsInvoices.uncheckApproveAndPayCheckboxIfChecked();
      cy.visit(TopMenu.invoicesPath);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C399084 Invoice can be approved when balance is close to the encumbrance available balance (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C399084'] },
    () => {
      // Click invoice line record on invoice
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.selectInvoiceLine();

      // "Current encumbrance" field contains "$98"
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          currentEncumbrance: '98.00',
        },
      ]);

      // Click "Actions" button, Select "Edit" option
      const InvoiceLineEditForm = InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Replace value in "Sub-total" field with "96.99", Click "Save & close" button
      InvoiceLineEditForm.fillInvoiceLineFields({
        subTotal: '96',
      });
      InvoiceLineEditForm.clickSaveButton();

      // Click "Actions" button, Select "Approve", Click "Submit" button
      InvoiceView.approveInvoice();

      // Invoice status is changed to "Approved"
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Status', value: INVOICE_STATUSES.APPROVED },
          { key: 'Fiscal year', value: testData.fiscalYear.code },
        ],
      });

      // Click invoice line record on invoice
      InvoiceView.selectInvoiceLine();

      // "Current encumbrance" field contains "$0.00"
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          currentEncumbrance: '0.00',
        },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '0.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '98.00' },
          { key: 'Awaiting payment', value: '96.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
