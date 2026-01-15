import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('ui-orders: Orders and Order lines', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 50,
  };
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
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
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
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Budgets.deleteViaApi(firstBudget.id);
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C658 Create an order and at least one order line for format = electronic resource  (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C658'] },
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
    { tags: ['criticalPath', 'thunderjet', 'C659'] },
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
    { tags: ['criticalPath', 'thunderjet', 'C661'] },
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
