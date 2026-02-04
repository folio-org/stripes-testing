import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Permissions from '../../support/dictionary/permissions';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import Approvals from '../../support/fragments/settings/invoices/approvals';

describe('Invoices', { retries: { runMode: 1 } }, () => {
  const organization = NewOrganization.getDefaultOrganization();
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const isApprovePayEnabled = true;
  const testData = {
    organization,
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderLine: {},
    firstInvoice: {},
    secondInvoice: {},
    user: {},
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      budget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        // defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = ledgerResponse.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.code = fundResponse.fund.code;
          defaultFund.id = fundResponse.fund.id;
          budget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(budget);
          ServicePoints.getViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint[0].id;
            NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
              (res) => {
                testData.location = res;

                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      testData.vendorId = organization.id;

                      // create the first order and open invoice
                      testData.firstOrder = NewOrder.getDefaultOrder({
                        vendorId: testData.organization.id,
                        manualPo: false,
                      });
                      testData.firstOrderLine = BasicOrderLine.getDefaultOrderLine({
                        acquisitionMethod: params.id,
                        automaticExport: true,
                        purchaseOrderId: testData.firstOrder.id,
                        vendorDetail: { vendorAccount: null },
                        fundDistribution: [
                          { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                        ],
                      });

                      Orders.createOrderWithOrderLineViaApi(
                        testData.firstOrder,
                        testData.firstOrderLine,
                      ).then((order) => {
                        testData.firstOrder = order;

                        Orders.updateOrderViaApi({
                          ...testData.firstOrder,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });

                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: defaultFiscalYear.id,
                        poLineId: testData.firstOrderLine.id,
                        fundDistributions: testData.firstOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: 1,
                      }).then((firstInvoiceResponse) => {
                        testData.firstInvoice = firstInvoiceResponse;
                      });

                      // create the second order and open invoice
                      testData.secondOrder = NewOrder.getDefaultOrder({
                        vendorId: testData.organization.id,
                        manualPo: false,
                      });
                      testData.secondOrderLine = BasicOrderLine.getDefaultOrderLine({
                        acquisitionMethod: params.id,
                        automaticExport: true,
                        purchaseOrderId: testData.secondOrder.id,
                        vendorDetail: { vendorAccount: null },
                        fundDistribution: [
                          { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                        ],
                      });

                      Orders.createOrderWithOrderLineViaApi(
                        testData.secondOrder,
                        testData.secondOrderLine,
                      ).then((order) => {
                        testData.secondOrder = order;

                        Orders.updateOrderViaApi({
                          ...testData.secondOrder,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });

                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: defaultFiscalYear.id,
                        poLineId: testData.secondOrderLine.id,
                        fundDistributions: testData.secondOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: 1,
                      }).then((secondInvoiceResponse) => {
                        testData.secondInvoice = secondInvoiceResponse;

                        Invoices.updateInvoiceViaApi({
                          ...secondInvoiceResponse,
                          vendorInvoiceNo: testData.firstInvoice.vendorInvoiceNo,
                        });
                      });
                    },
                  );
                });
              },
            );
          });
        });
      });
    });
    Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
      Invoices.searchByNumber(testData.firstInvoice.vendorInvoiceNo);
      Invoices.sortInvoicesBy('Status');
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C440075 Check invoice duplicate validation on "Approve & pay" option (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440075'] },
    () => {
      Invoices.selectInvoiceByIndex(testData.firstInvoice.vendorInvoiceNo, 1);
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled });
      ApproveInvoiceModal.verifyModalViewForDuplicateInvoice(
        { isApprovePayEnabled },
        testData.firstInvoice.vendorInvoiceNo,
      );
      ApproveInvoiceModal.clickSubmitButton({ isApprovePayEnabled });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });
      Invoices.closeInvoiceDetailsPane();
      Invoices.selectInvoiceByIndex(testData.firstInvoice.vendorInvoiceNo, 0);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
    },
  );
});
