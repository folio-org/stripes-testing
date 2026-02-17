import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import FundDetails from '../../support/fragments/finance/funds/fundDetails';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import TransactionDetails from '../../support/fragments/finance/transactions/transactionDetails';
import Transactions from '../../support/fragments/finance/transactions/transactions';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceDetails from '../../support/fragments/invoices/invoiceView';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';

describe('orders: Unopen order', { retries: { runMode: 1 } }, () => {
  const order = { ...NewOrder.defaultOngoingTimeOrder, approved: true, reEncumber: true };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    addresses: [
      {
        addressLine1: '1 Centerpiece Blvd.',
        addressLine2: 'P.O. Box 15550',
        city: 'New Castle',
        stateRegion: 'DE',
        zipCode: '19720-5550',
        country: 'USA',
        isPrimary: true,
        categories: [],
        language: 'English',
      },
    ],
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };

  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  let firstInvoice;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      firstBudget.fiscalYearId = defaultFiscalYearResponse.id;
      secondBudget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);

            // Create second Fiscal Year for Rollover
            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;

                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
                    cy.getAcquisitionMethodsApi({
                      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                    }).then((params) => {
                      // Prepare 2 Open Orders for Rollover
                      Organizations.createOrganizationViaApi(organization).then(
                        (responseOrganizations) => {
                          organization.id = responseOrganizations;
                          order.vendor = organization.id;
                          const firstOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            cost: {
                              listUnitPrice: 100.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 100.0,
                            },
                            fundDistribution: [
                              { code: firstFund.code, fundId: firstFund.id, value: 100 },
                            ],
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding',
                              materialType: mtypes.body.id,
                              materialSupplier: responseOrganizations,
                              volumes: [],
                            },
                          };
                          Orders.createOrderViaApi(order).then((orderResponse) => {
                            order.id = orderResponse.id;
                            orderNumber = orderResponse.poNumber;
                            firstOrderLine.purchaseOrderId = orderResponse.id;

                            OrderLines.createOrderLineViaApi(firstOrderLine);
                            Orders.updateOrderViaApi({
                              ...orderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
                            Invoices.createInvoiceWithInvoiceLineViaApi({
                              vendorId: organization.id,
                              fiscalYearId: defaultFiscalYear.id,
                              poLineId: firstOrderLine.id,
                              fundDistributions: firstOrderLine.fundDistribution,
                              accountingCode: organization.erpCode,
                              releaseEncumbrance: true,
                              subTotal: 100,
                            }).then((invoiceRescponse) => {
                              firstInvoice = invoiceRescponse;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: firstInvoice,
                                status: INVOICE_STATUSES.PAID,
                              });
                            });
                            cy.waitForAuthRefresh(() => {
                              cy.loginAsAdmin({
                                path: TopMenu.ordersPath,
                                waiter: Orders.waitLoading,
                              });
                            });
                            Orders.searchByParameter('PO number', orderNumber);
                            Orders.selectFromResultsList(orderNumber);
                            OrderLines.selectPOLInOrder(0);
                            OrderLines.editPOLInOrder();
                            OrderLines.changeFundInPOL(secondFund);
                            InteractorsTools.checkCalloutMessage(
                              `The purchase order line ${orderNumber}-1 was successfully updated`,
                            );
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
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375106 Unopen order with changed Fund distribution when related paid invoice exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375106', 'shiftLeft'] },
    () => {
      /* Orders app */
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.unOpenOrder();
      OrderLines.selectPOLInOrder(0); // Order details -> PO Line details
      OrderLineDetails.waitLoading();
      OrderLines.checkFundInPOL(secondFund);
      OrderLines.backToEditingOrder(); // Order Line details -> Order details
      Orders.openOrder();
      OrderLines.selectPOLInOrder(0); // Order details -> PO Line details
      OrderLineDetails.waitLoading();
      OrderLines.checkFundInPOL(secondFund);
      TopMenuNavigation.navigateToApp('Finance'); // Order Line details -> Finance app

      /* Finance app */
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name); // Funds results -> Fund details
      FundDetails.waitLoading();
      Funds.selectBudgetDetails(); // Fund details -> Budget details
      Funds.viewTransactions(); // Budget details -> Transactions
      Transactions.waitLoading();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.waitLoading();
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      InteractorsTools.closeAllVisibleCallouts();
      Funds.closeTransactionDetails(); // Transactions -> Budget details
      Funds.closePaneHeader();
      Funds.closeBudgetDetails(); // Budget details -> Fund details
      Funds.closeFundDetails(); // Fund details -> Funds results
      TopMenuNavigation.navigateToApp('Invoices');

      /* Invoices app */
      Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(firstInvoice.vendorInvoiceNo); // Invoices results -> Invoice details
      InvoiceDetails.waitLoading();
      Invoices.selectInvoiceLine(); // Invoice details -> Invoice line details
      TopMenuNavigation.navigateToApp('Finance');

      /* Finance app */
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name); // Funds results -> Fund details
      FundDetails.waitLoading();
      Funds.selectBudgetDetails(); // Fund details -> Budget details
      Funds.viewTransactions(); // Budget details -> Transactions
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($20.00)',
        firstInvoice.vendorInvoiceNo,
        'Payment',
        `${firstFund.name} (${firstFund.code})`,
      );
    },
  );
});
