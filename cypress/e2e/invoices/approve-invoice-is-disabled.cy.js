import { DevTeams, TestTypes, Permissions, Parallelization } from '../../support/dictionary';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import { NewOrder, BasicOrderLine, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization);
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  beforeEach(() => {
    testData.order = NewOrder.getDefaultOrder({ vendorId: organization.id });
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      listUnitPrice: 98,
      fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
    });

    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    });

    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
  });

  afterEach(() => {
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id);
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  [
    {
      description:
        'C397321 User is not able to approve and pay invoice with linked order in "Pending" status ("Approve and pay in one click" setting is enabled) (thunderjet) (TaaS)',
      isApprovePayEnabled: true,
    },
    {
      description:
        'C397326 User is not able to approve and pay invoice with linked order in "Pending" status ("Approve and pay in one click" setting is disabled) (thunderjet) (TaaS)',
      isApprovePayEnabled: false,
    },
  ].forEach(({ description, isApprovePayEnabled }) => {
    it(
      description,
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet, Parallelization.nonParallel] },
      () => {
        Approvals.setApprovePayValue(isApprovePayEnabled);

        // Click on "Vendor invoice number" link
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

        // * Invoice "Status" is "Open" under "Invoice information" accordion
        // * "Total number of invoice lines: 0" text is displayed under "Invoice lines" accordion
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: 'Status', value: INVOICE_STATUSES.OPEN },
            { key: 'Fiscal year', value: 'No value set' },
          ],
          invoiceLines: [],
        });

        // Click "Actions" button, Select "Add line from POL" option
        const SelectOrderLinesModal = InvoiceView.openSelectOrderLineModal();

        // Search for the POL, Select it by checking checkbox in "Order lines" pane, Click "Save" button
        SelectOrderLinesModal.selectOrderLine(testData.order.poNumber);

        // * Warning banner is displayed at top of invoice "Invoice can not be approved."
        InvoiceView.checkInvoiceCanNotBeApprovedWarning();

        // Click "Actions" menu button
        InvoiceView.expandActionsDropdown();
        InvoiceView.checkActionButtonsConditions([
          { label: 'Edit', conditions: { disabled: false } },
          {
            label: isApprovePayEnabled ? 'Approve & pay' : 'Approve',
            conditions: { disabled: true },
          },
          { label: 'Delete', conditions: { disabled: false } },
        ]);
      },
    );
  });
});
