import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const allocatedQuantity = '100';
  let user;
  let orderNumber;
  let location;

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addTwoExpensesClass('Electronic', 'Print');
        });
      });
    });
    cy.getLocations({ limit: 1 }).then((res) => {
      location = res;
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
    });
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.fillInPOLineInfoforPhysicalMaterialWithFundAndEC(
        defaultFund,
        '20',
        '1',
        'Electronic',
        '20',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.createTempUser([
      permissions.uiOrdersUnopenpurchaseorders.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      }, 20_000);
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C399087 Adding same fund distribution with different expense class in the POL for unopened order (thunderjet)',
    { tags: ['criticalPathFlaky', 'thunderjet', 'C399087'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.unOpenOrder();
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.addTwoFundsToPOLinPercent(defaultFund, '50', 'Electronic', 'Print', '50');
      Orders.backToPO();
      Orders.openOrder();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransaction('row-1');
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.checkEncumbrance(orderNumber, '($10.00)');
      Funds.selectTransaction('row-2');
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.checkEncumbrance(orderNumber, '($10.00)');
    },
  );
});
