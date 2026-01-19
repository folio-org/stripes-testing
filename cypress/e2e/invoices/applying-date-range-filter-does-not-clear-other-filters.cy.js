import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FinanceHelper from '../../support/fragments/finance/financeHelper';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Integrations from '../../support/fragments/organizations/integrations/integrations';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: `account_C350632_${getRandomPostfix()}`,
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'autotest_account',
          notes: '',
          paymentMethod: 'EFT',
        },
      ],
    },
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    order: {},
    orderLine: {},
    firstInvoice: {
      vendorInvoiceNo: FinanceHelper.getRandomInvoiceNumber(),
    },
    secondInvoice: {
      vendorInvoiceNo: FinanceHelper.getRandomInvoiceNumber(),
    },
    integration: {},
    location: {},
    servicePoint: {},
    user: {},
  };

  const previousDate = DateTools.getPreviousDayDate();
  const nextDate = DateTools.getTomorrowDayDateForFiscalYear();

  before('Create test data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;
      testData.ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: testData.fiscalYear.id,
      };

      Ledgers.createViaApi(testData.ledger).then((ledgerResponse) => {
        testData.ledger.id = ledgerResponse.id;
        testData.fund = {
          ...Funds.defaultUiFund,
          ledgerId: testData.ledger.id,
        };

        Funds.createViaApi(testData.fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;
          testData.budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: testData.fund.id,
            allocated: 1000,
          };

          Budgets.createViaApi(testData.budget).then((budgetResponse) => {
            testData.budget.id = budgetResponse.id;

            Organizations.createOrganizationViaApi(testData.organization).then(
              (organizationResponse) => {
                testData.organization.id = organizationResponse;

                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                }).then((params) => {
                  testData.integration = Integrations.getDefaultIntegration({
                    vendorId: testData.organization.id,
                    acqMethodId: params.body.acquisitionMethods[0].id,
                    accountNoList: [testData.organization.accounts[0].accountNo],
                    scheduleTime: moment().utc().format('HH:mm:ss'),
                    isDefaultConfig: false,
                  });

                  Integrations.createIntegrationViaApi(testData.integration).then(
                    (integrationResponse) => {
                      testData.integration.id = integrationResponse.id;
                      ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then(
                        (response) => {
                          testData.servicePoint = response.body;

                          NewLocation.createViaApi(
                            NewLocation.getDefaultLocation(testData.servicePoint.id),
                          ).then((location) => {
                            testData.location = location;

                            testData.order = {
                              ...NewOrder.getDefaultOngoingOrder,
                              orderType: 'Ongoing',
                              ongoing: { isSubscription: false, manualRenewal: false },
                              approved: true,
                              reEncumber: true,
                              vendor: testData.organization.id,
                            };

                            testData.orderLine = {
                              ...BasicOrderLine.getDefaultOrderLine(),
                              cost: {
                                listUnitPriceElectronic: 4.0,
                                currency: 'USD',
                                discountType: 'percentage',
                                quantityElectronic: 2,
                                poLineEstimatedPrice: 8.0,
                              },
                              orderFormat: 'Electronic Resource',
                              eresource: {
                                activated: false,
                                createInventory: 'None',
                                trial: false,
                                accessProvider: testData.organization.id,
                              },
                              fundDistribution: [
                                {
                                  code: testData.fund.code,
                                  fundId: testData.fund.id,
                                  value: 100,
                                },
                              ],
                              locations: [
                                {
                                  locationId: testData.location.id,
                                  quantity: 2,
                                  quantityElectronic: 2,
                                },
                              ],
                              acquisitionMethod: params.body.acquisitionMethods[0].id,
                            };

                            Orders.createOrderViaApi(testData.order).then((orderResponse) => {
                              testData.order.id = orderResponse.id;
                              testData.order.poNumber = orderResponse.poNumber;
                              testData.orderLine.purchaseOrderId = orderResponse.id;

                              OrderLines.createOrderLineViaApi(testData.orderLine).then(
                                (orderLineResponse) => {
                                  testData.orderLine.id = orderLineResponse.id;
                                  testData.orderLine.poLineNumber = orderLineResponse.poLineNumber;

                                  Orders.updateOrderViaApi({
                                    ...orderResponse,
                                    workflowStatus: ORDER_STATUSES.OPEN,
                                  });
                                },
                              );
                            });
                          });
                        },
                      );
                    },
                  );
                });
              },
            );
          });
        });
      });
    });
    cy.createTempUser([
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesApproveInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C350632 Applying a date range Invoice filter DOES NOT clear other filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C350632'] },
    () => {
      const InvoiceEditFormFirst = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditFormFirst.fillInvoiceFields({
        invoiceDate: previousDate,
        status: INVOICE_STATUSES.OPEN,
        vendorInvoiceNo: testData.firstInvoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        batchGroupName: 'FOLIO',
        paymentMethod: 'EFT',
      });
      InvoiceEditFormFirst.clickSaveButton();

      Invoices.closeInvoiceDetailsPane();

      const InvoiceEditFormSecond = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditFormSecond.fillInvoiceFields({
        invoiceDate: nextDate,
        status: INVOICE_STATUSES.OPEN,
        vendorInvoiceNo: testData.secondInvoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        batchGroupName: 'FOLIO',
        paymentMethod: 'EFT',
      });
      InvoiceEditFormSecond.clickSaveButton();

      const InvoiceLineEditFormSecond = InvoiceView.openInvoiceLineEditForm();

      InvoiceLineEditFormSecond.selectOrderLines(testData.orderLine.poLineNumber);

      InvoiceLineEditFormSecond.selectFundDistribution(testData.fund.name);

      InvoiceLineEditFormSecond.clickSaveButton();

      Invoices.approveInvoice();

      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
      });

      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();

      Invoices.selectStatusFilter('Open');
      Invoices.searchByNumber(testData.firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
      Invoices.closeInvoiceDetailsPane();
      Invoices.searchByNumber(testData.secondInvoice.vendorInvoiceNo);
      Invoices.checkZeroSearchResultsHeader();

      Invoices.selectInvoiceDateFilter(previousDate, nextDate);
      Invoices.searchByNumber(testData.firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
      Invoices.closeInvoiceDetailsPane();
      Invoices.searchByNumber(testData.secondInvoice.vendorInvoiceNo);
      Invoices.checkZeroSearchResultsHeader();
    },
  );
});
