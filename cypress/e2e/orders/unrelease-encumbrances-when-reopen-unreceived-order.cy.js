import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  Ledgers,
  Transactions,
} from '../../support/fragments/finance';
import Invoices from '../../support/fragments/invoices/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  let user;
  let orderNumber;
  let location;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((defaultFiscalYearResponse) => {
      fiscalYear.id = defaultFiscalYearResponse.id;
      budget.fiscalYearId = defaultFiscalYearResponse.id;
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
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      order.vendor = organization.id;
                      const orderLine = {
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

                      Orders.createOrderViaApi(order).then((defaultOrderResponse) => {
                        order.id = defaultOrderResponse.id;
                        orderNumber = defaultOrderResponse.poNumber;
                        orderLine.purchaseOrderId = defaultOrderResponse.id;

                        OrderLines.createOrderLineViaApi(orderLine);
                        Orders.updateOrderViaApi({
                          ...defaultOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: fiscalYear.id,
                          poLineId: orderLine.id,
                          fundDistributions: orderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 100,
                        }).then((invoiceRescponse) => {
                          Invoices.changeInvoiceStatusViaApi({
                            invoice: invoiceRescponse,
                            status: INVOICE_STATUSES.PAID,
                          });
                          cy.loginAsAdmin({
                            path: TopMenu.ordersPath,
                            waiter: Orders.waitLoading,
                          });
                          Orders.searchByParameter('PO number', orderNumber);
                          Orders.selectFromResultsList(orderNumber);
                          Orders.cancelOrder();
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
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersReopenPurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
    Orders.deleteOrderViaApi(order.id);
  });

  it(
    'C889712 Unrelease encumbrances when reopen unreceived ongoing order with related paid invoice (Release encumbrance =true) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C889712'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.waitLoading();
      Orders.selectFromResultsList(orderNumber);
      OrderDetails.waitLoading();
      OrderDetails.reOpenOrder({ orderNumber });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      Funds.waitLoading();
      FinanceHelper.searchByName(fund.name);
      Funds.selectFund(fund.name);
      FundDetails.waitLoading();
      Funds.selectBudgetDetails(); // Fund details -> Budget details
      BudgetDetails.waitLoading();
      Funds.openTransactions(); // Budget details -> Transactions
      Transactions.waitLoading();
      Funds.selectTransactionInList('Encumbrance');
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
