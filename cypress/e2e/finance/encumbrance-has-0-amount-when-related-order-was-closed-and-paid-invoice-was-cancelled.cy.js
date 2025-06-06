import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_LINE_PAYMENT_STATUS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('Finance', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let firstInvoice;
  let user;
  let firstOrderNumber;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          cy.getLocations({ limit: 1 }).then((res) => {
            location = res;

            cy.getMaterialTypes({ limit: 1 }).then((mtype) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                // Prepare 2 Open Orders for Rollover
                Organizations.createOrganizationViaApi(organization).then(
                  (responseOrganizations) => {
                    organization.id = responseOrganizations;
                    firstOrder.vendor = organization.id;
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 1.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 1.0,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
                      ],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtype.id,
                        materialSupplier: responseOrganizations,
                        volumes: [],
                      },
                    };
                    Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                      firstOrder.id = firstOrderResponse.id;
                      firstOrderNumber = firstOrderResponse.poNumber;
                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      Orders.updateOrderViaApi({
                        ...firstOrderResponse,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: firstFiscalYear.id,
                        poLineId: firstOrderLine.id,
                        fundDistributions: firstOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: 1,
                      }).then((invoiceRescponse) => {
                        firstInvoice = invoiceRescponse;

                        Invoices.changeInvoiceStatusViaApi({
                          invoice: firstInvoice,
                          status: INVOICE_STATUSES.PAID,
                        }).then(() => {
                          cy.wait(4000);
                          Orders.updateOrderViaApi({
                            ...firstOrderResponse,
                            workflowStatus: ORDER_STATUSES.CLOSED,
                            closeReason: { reason: 'Cancelled', note: '' },
                          });
                          cy.wait(4000);

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.CANCELLED,
                          });
                        });
                      });
                    });
                  },
                );
              });
            });
          });
        });
      });
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C494339 Encumbrance has "0" amount when related order was closed and paid invoice was cancelled (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.CANCELLED);
      OrderLines.checkPaymentStatusInPOL(ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT);
      OrderLines.openPageCurrentEncumbrance('$0.00');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${firstOrderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
    },
  );
});
