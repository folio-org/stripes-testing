import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Invoices } from '../../support/fragments/invoices';
import { Budgets, FinanceHelper } from '../../support/fragments/finance';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import DateTools from '../../support/utils/dateTools';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    servicePoint: ServicePoints.getDefaultServicePoint(),
    location: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.budget = budget;
    testData.fiscalYear = fiscalYear;

    ServicePoints.createViaApi(testData.servicePoint).then(() => {
      testData.location = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      });

      Locations.createViaApi(testData.location).then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getBatchGroups().then(({ id: batchGroupId, name: batchGroupName }) => {
            testData.invoice = Invoices.getDefaultInvoice({
              batchGroupId,
              batchGroupName,
              vendorId: testData.organization.id,
              vendorName: testData.organization.name,
              accountingCode: testData.organization.erpCode,
              invoiceDate: DateTools.getCurrentDate(),
            });
          });

          const orderLine = BasicOrderLine.getDefaultOrderLine({
            fundDistribution: [{ fundId: fund.id, value: budget.allowableEncumbrance }],
            specialLocationId: testData.location.id,
            vendorAccount: testData.organization.name,
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, orderLine).then((order) => {
            testData.order = order;

            Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
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
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
    Locations.deleteViaApi(testData.location);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C387533 "Fiscal year" field is NOT displayed and can NOT be selected by user without "Invoice: Pay invoices in a different fiscal year" permission when creating and editing invoice (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // #1 Click "Actions" button on the second "Invoices" pane -> select "New" option
      const InvoiceEditForm = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditForm.checkFiscalYearIsAbsent();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // #2 Fill all mandatory fields with valid values:
      InvoiceEditForm.fillInvoiceFields(testData.invoice);

      // #3 Click "Save & close" button
      InvoiceEditForm.clickSaveButton();

      // * "Fiscal year" field is displayed and has no values
      Invoices.checkCreatedInvoice({
        ...testData.invoice,
        invoiceNumber: testData.invoice.vendorInvoiceNo,
        information: { fiscalYear: 'No value set', status: 'Open' },
      });

      // #4 Click "Actions" button on the third "Vendor invoice number - <number>" pane -> select "Edit" option
      Invoices.openInvoiceEditForm({ createNew: false });
      InvoiceEditForm.checkFiscalYearIsAbsent();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // #5 Make some changes (e.g. add some value in "Note" field in "Invoice information" accordion)
      testData.invoice.vendorInvoiceNo = FinanceHelper.getRandomInvoiceNumber();
      InvoiceEditForm.fillInvoiceFields(testData.invoice);

      // #6 Click "Save & close" button
      InvoiceEditForm.clickSaveButton();

      // * "Fiscal year" field is displayed and has no values
      Invoices.checkCreatedInvoice({
        ...testData.invoice,
        invoiceNumber: testData.invoice.vendorInvoiceNo,
        information: { fiscalYear: 'No value set', status: 'Open' },
      });

      // #7 Click "Actions" button in "Invoice lines" accordion -> Select "Add line from POL" option
      Invoices.createInvoiceLineFromPol(testData.order.poNumber);

      // "Fiscal year" field is displayed and has value related to fund distribution specified in linked POL
      // Invoice status remains "Open"
      Invoices.checkCreatedInvoice({
        ...testData.invoice,
        invoiceNumber: testData.invoice.vendorInvoiceNo,
        information: { fiscalYear: testData.fiscalYear.code, status: 'Open' },
      });
    },
  );
});
