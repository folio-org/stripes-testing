import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };
  const order = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let firstInvoice;
  let secondInvoice;
  let user;
  let location;
  let orderLine;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((firstFiscalYearResponse) => {
      fiscalYear.id = firstFiscalYearResponse.id;
      budget.fiscalYearId = firstFiscalYearResponse.id;
      ledger.fiscalYearOneId = fiscalYear.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        fund.ledgerId = ledger.id;

        Funds.createViaApi(fund).then((fundResponse) => {
          fund.id = fundResponse.fund.id;
          budget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(budget);

          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locationResponse) => {
              location = locationResponse;

              cy.getBookMaterialType().then((mtypes) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  // Prepare 2 Open Orders for Rollover
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      order.vendor = organization.id;
                      orderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 100.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 100.0,
                        },
                        fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
                        locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtypes.id,
                          materialSupplier: responseOrganizations,
                          volumes: [],
                        },
                      };
                      Orders.createOrderViaApi(order).then((orderResponse) => {
                        order.id = orderResponse.id;
                        orderLine.purchaseOrderId = orderResponse.id;

                        OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                          orderLine.poLineNumber = orderLineResponse.poLineNumber;
                        });
                        Orders.updateOrderViaApi({
                          ...orderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: fiscalYear.id,
                          poLineId: orderLine.id,
                          fundDistributions: orderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 50,
                        }).then((invoiceRescponse) => {
                          firstInvoice = invoiceRescponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });

                          Invoices.createInvoiceWithInvoiceLineViaApi({
                            vendorId: organization.id,
                            fiscalYearId: fiscalYear.id,
                            poLineId: orderLine.id,
                            fundDistributions: orderLine.fundDistribution,
                            accountingCode: organization.erpCode,
                            releaseEncumbrance: true,
                            subTotal: 50,
                          })
                            .then((secondInvoiceRescponse) => {
                              secondInvoice = secondInvoiceRescponse;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: secondInvoice,
                                status: INVOICE_STATUSES.PAID,
                              });
                            })
                            .then(() => {
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
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C889711 POL payment status remains "Fully paid" after cancelling one of related paid invoice (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C889711'] },
    () => {
      Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
      });

      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: fund.name, currentEncumbrance: '0.00' },
      ]);

      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYear.code },
          { key: 'Amount', value: '0.00' },
          { key: 'Source', value: orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: fund.name },
          { key: 'Initial encumbrance', value: '100.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '50.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      TransactionDetails.openSourceInTransactionDetails(orderLine.poLineNumber);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [{ key: 'Payment status', value: 'Fully Paid' }],
      });
    },
  );
});
