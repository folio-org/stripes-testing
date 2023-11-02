import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../support/utils/interactorsTools';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-orders: Orders and Order lines', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '50';
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  let user;

  beforeEach(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    cy.createTempUser([permissions.uiOrdersCreate.gui, permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  afterEach(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    // Need to wait,while data will be deleted
    cy.wait(1000);
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C658 Create an order and at least one order line for format = electronic resource  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        OrderLines.addPOLine();
        OrderLines.POLineInfoforElectronicResource(orderLineTitle, defaultFund);
        InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
        OrderLines.checkCreatedPOLineElectronicResource(orderLineTitle, defaultFund);
        OrderLines.backToEditingOrder();
      });
    },
  );

  it(
    'C659 Create an order and at least one order line for format = physical resource with multiple copies  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        OrderLines.addPOLine();
        OrderLines.POLineInfodorPhysicalMaterialWithFund(orderLineTitle, defaultFund);
        InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
        OrderLines.checkCreatedPOLinePhysicalResource(orderLineTitle, defaultFund);
        OrderLines.backToEditingOrder();
      });
    },
  );

  it(
    'C661 Create an order and at least one order line for format = other  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        OrderLines.addPOLine();
        OrderLines.POLineInfodorOtherMaterialWithFund(orderLineTitle, defaultFund);
        InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
        OrderLines.checkCreatedPOLineOtherResource(orderLineTitle, defaultFund);
        OrderLines.backToEditingOrder();
      });
    },
  );
});
