import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { Invoices, NewInvoice } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((response) => {
      fiscalYear.id = response.id;
      ledger.fiscalYearOneId = fiscalYear.id;
      firstBudget.fiscalYearId = response.id;
      secondBudget.fiscalYearId = response.id;

      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        firstFund.ledgerId = ledger.id;
        secondFund.ledgerId = ledger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;

          Budgets.createViaApi(firstBudget);
          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;

            Budgets.createViaApi(secondBudget);
            Organizations.createOrganizationViaApi(organization).then((orgResp) => {
              organization.id = orgResp;

              cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
                (locationResp) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((amResp) => {
                    cy.getBookMaterialType().then((mtypeResp) => {
                      const order = {
                        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
                        orderType: 'One-Time',
                        approved: true,
                        reEncumber: true,
                      };
                      const orderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 20.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 20.0,
                        },
                        fundDistribution: [
                          {
                            code: firstFund.code,
                            fundId: firstFund.id,
                            value: 100,
                          },
                        ],
                        locations: [
                          { locationId: locationResp.id, quantity: 1, quantityPhysical: 1 },
                        ],
                        acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtypeResp.id,
                          materialSupplier: orgResp,
                          volumes: [],
                        },
                      };

                      Orders.createOrderViaApi(order).then((orderResp) => {
                        order.id = orderResp.id;
                        orderNumber = orderResp.poNumber;
                        orderLine.purchaseOrderId = orderResp.id;

                        OrderLines.createOrderLineViaApi(orderLine).then(() => {
                          Orders.updateOrderViaApi({
                            ...orderResp,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                          Invoices.createInvoiceWithInvoiceLineViaApi({
                            vendorId: organization.id,
                            fiscalYearId: fiscalYear.id,
                            poLineId: orderLine.id,
                            fundDistributions: orderLine.fundDistribution,
                            accountingCode: organization.id,
                            releaseEncumbrance: true,
                            exportToAccounting: true,
                          }).then((invoiceResp) => {
                            invoice.id = invoiceResp.id;
                            invoice.vendorInvoiceNo = invoiceResp.vendorInvoiceNo;

                            Invoices.changeInvoiceStatusViaApi({
                              invoice: invoiceResp,
                              status: INVOICE_STATUSES.APPROVED,
                            });
                            Invoices.changeInvoiceStatusViaApi({
                              invoice: invoiceResp,
                              status: INVOICE_STATUSES.CANCELLED,
                            });
                          });
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

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersEdit.gui,
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
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C368478 Editing fund distribution in PO line when related Cancelled from approved invoice exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C368478'] },
    () => {
      Orders.resetFiltersIfActive();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(secondFund, '20', '100');
      OrderLines.checkFundInPOL(secondFund);

      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.verifyDetailsInTransactionFundTo(
        fiscalYear.code,
        '($20.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.closeTransactionDetails();

      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(invoice.vendorInvoiceNo);
      Invoices.selectInvoice(invoice.vendorInvoiceNo);
      Invoices.selectInvoiceLine();
      Invoices.checkFundInInvoiceLine(firstFund);

      TopMenuNavigation.navigateToApp('Finance');
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      Funds.closeFundDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.verifyDetailsInTransactionFundTo(
        fiscalYear.code,
        '($50.00)',
        invoice.invoiceNumber,
        'Pending payment',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.clickInfoInTransactionDetails();
    },
  );
});
