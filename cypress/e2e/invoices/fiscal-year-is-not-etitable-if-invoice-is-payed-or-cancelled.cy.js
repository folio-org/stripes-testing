import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';

import TopMenu from '../../support/fragments/topMenu';
import { Invoices } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import Organizations from '../../support/fragments/organizations/organizations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import InteractorsTools from '../../support/utils/interactorsTools';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const createInvoiceWithStatus = (testData, status) => {
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
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            fundDistribution: [{ fundId: fund.id, value: budget.allowableEncumbrance }],
            specialLocationId: testData.location.id,
            vendorAccount: testData.organization.name,
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, orderLine).then((order) => {
            Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });

            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.organization.id,
              poLineId: orderLine.id,
              fundDistributions: [{ fundId: fund.id, value: budget.allowableEncumbrance }],
              accountingCode: testData.organization.erpCode,
            }).then((invoice) => {
              testData.invoice = invoice;

              Invoices.changeInvoiceStatusViaApi({ invoice: testData.invoice, status });
            });
          });
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
  };

  const cleanUpTestData = (testData) => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  };

  [
    {
      status: INVOICE_STATUSES.APPROVED,
      description:
        'C387534 "Fiscal year" field is not editable for approved invoice (thunderjet) (TaaS)',
    },
    {
      status: INVOICE_STATUSES.PAID,
      description:
        'C387536 "Fiscal year" field is not editable for paid invoice (thunderjet) (TaaS)',
    },
    {
      status: INVOICE_STATUSES.CANCELLED,
      description:
        'C387537 "Fiscal year" field is not editable for cancelled invoice (thunderjet) (TaaS)',
    },
  ].forEach(({ status, description }) => {
    describe(`Invoice status = "${status}"`, () => {
      const organization = NewOrganization.getDefaultOrganization();
      const testData = {
        organization,
        order: { ...NewOrder.getDefaultOrder(organization.id), reEncumber: true },
        servicePoint: ServicePoints.defaultServicePoint,
        location: {},
        user: {},
      };

      before('Create test data', () => {
        createInvoiceWithStatus(testData, status);
      });

      after('Delete test data', () => {
        cleanUpTestData(testData);
      });

      it(description, { tags: [TestTypes.criticalPath, DevTeams.thunderjet] }, () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        Invoices.checkInvoiceDetails({
          ...testData.invoice,
          status,
          fiscalYear: testData.fiscalYear.code,
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
        Invoices.checkInvoiceDetails({
          ...testData.invoice,
          status,
          fiscalYear: testData.fiscalYear.code,
        });
      });
    });
  });
});
