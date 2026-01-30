import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Approvals from '../../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance: Transactions', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const firstFund = { ...Funds.defaultUiFund };

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
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const isApprovePayEnabled = true;
  let thirdInvoice;
  let firstInvoice;
  let secondInvoice;
  let user;
  let location;
  let firstOrderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
          cy.getAdminToken();

          cy.getLocations({ limit: 1 }).then((res) => {
            location = res;

            cy.getDefaultMaterialType().then((mtype) => {
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
                        listUnitPrice: 10,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 10,
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
                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                      firstOrderNumber = firstOrderResponse.poNumber;

                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      Orders.updateOrderViaApi({
                        ...firstOrderResponse,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                    });
                    Invoices.createInvoiceWithInvoiceLineViaApi({
                      vendorId: organization.id,
                      fiscalYearId: defaultFiscalYear.id,
                      fundDistributions: firstOrderLine.fundDistribution,
                      accountingCode: organization.erpCode,
                      releaseEncumbrance: true,
                      subTotal: 15,
                    }).then((invoiceResponse) => {
                      firstInvoice = invoiceResponse;

                      Invoices.changeInvoiceStatusViaApi({
                        invoice: firstInvoice,
                        status: INVOICE_STATUSES.APPROVED,
                      });
                    });

                    Invoices.createInvoiceWithInvoiceLineViaApi({
                      vendorId: organization.id,
                      fiscalYearId: defaultFiscalYear.id,
                      fundDistributions: firstOrderLine.fundDistribution,
                      accountingCode: organization.erpCode,
                      releaseEncumbrance: true,
                      subTotal: -20,
                    }).then((secondInvoiceResponse) => {
                      secondInvoice = secondInvoiceResponse;

                      Invoices.changeInvoiceStatusViaApi({
                        invoice: secondInvoice,
                        status: INVOICE_STATUSES.PAID,
                      });
                    });

                    Invoices.createInvoiceViaApi({
                      vendorId: organization.id,
                      accountingCode: organization.erpCode,
                    }).then((thirdInvoiceResponse) => {
                      thirdInvoice = thirdInvoiceResponse;

                      OrderLines.getOrderLineViaApi({
                        query: `poLineNumber=="*${firstOrderNumber}*"`,
                      }).then((orderLines) => {
                        const firstInvoiceLine = Invoices.getDefaultInvoiceLine({
                          invoiceId: thirdInvoice.id,
                          invoiceLineStatus: thirdInvoice.status,
                          fundDistributions: orderLines[0].fundDistribution,
                          accountingCode: organization.erpCode,
                          quantity: 1,
                          subTotal: 16,
                        });
                        Invoices.createInvoiceLineViaApi(firstInvoiceLine);

                        const secondInvoiceLine = Invoices.getDefaultInvoiceLine({
                          invoiceId: thirdInvoice.id,
                          invoiceLineStatus: thirdInvoice.status,
                          fundDistributions: orderLines[0].fundDistribution,
                          accountingCode: organization.erpCode,
                          quantity: 1,
                          subTotal: -10,
                        });
                        Invoices.createInvoiceLineViaApi(secondInvoiceLine);

                        const thirdInvoiceLine = Invoices.getDefaultInvoiceLine({
                          invoiceId: thirdInvoice.id,
                          invoiceLineStatus: thirdInvoice.status,
                          fundDistributions: orderLines[0].fundDistribution,
                          accountingCode: organization.erpCode,
                          quantity: 1,
                          subTotal: 100,
                        });
                        Invoices.createInvoiceLineViaApi(thirdInvoiceLine);
                        Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
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
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C496167 Invoice with three invoice lines (including credit) can NOT be paid when available expenditure balance is less that invoice total  (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C496167'] },
    () => {
      Invoices.searchByNumber(thirdInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(thirdInvoice.vendorInvoiceNo);
      Invoices.canNotApproveAndPayInvoice(
        `One or more Fund distributions on this invoice can not be paid, because there is not enough money in [${firstFund.code}].`,
      );
      Invoices.selectInvoiceLineByNumber('$16.00');
      Invoices.openPageFundInInvoiceLine(`${firstFund.name}(${firstFund.code})`);
      Funds.viewTransactionsForCurrentBudget();
      Funds.checkAbsentTransaction('Payment');
    },
  );
});
