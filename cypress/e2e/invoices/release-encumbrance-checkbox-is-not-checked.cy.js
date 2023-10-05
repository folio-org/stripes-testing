import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Invoices, InvoiceView, InvoiceLines } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
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
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    orderLine: {},
    servicePoint: ServicePoints.defaultServicePoint,
    location: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      ServicePoints.createViaApi(testData.servicePoint).then(() => {
        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        });

        Locations.createViaApi(testData.location).then(() => {
          Organizations.createOrganizationViaApi(testData.organization).then(() => {
            testData.orderLine = BasicOrderLine.getDefaultOrderLine({
              specialLocationId: testData.location.id,
              vendorAccount: testData.organization.name,
            });

            Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
              (order) => {
                testData.order = order;

                Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

                Invoices.createInvoiceViaApi({
                  vendorId: testData.organization.id,
                  accountingCode: testData.organization.erpCode,
                }).then((invoice) => {
                  testData.invoice = invoice;
                });
              },
            );
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
    'C389582 "Release encumbrance" checkbox is NOT checked after creating new blank invoice line (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // Open invoice by clicking on its "Vendor invoice number" link on "Invoices" pane
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      Invoices.checkInvoiceDetails({
        ...testData.invoice,
        status: INVOICE_STATUSES.OPEN,
        fiscalYear: 'No value set',
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
      InvoiceLines.checkInvoiceLineDetails({
        description: testData.orderLine.titleOrPackage,
        status: INVOICE_STATUSES.OPEN,
      });
    },
  );
});
