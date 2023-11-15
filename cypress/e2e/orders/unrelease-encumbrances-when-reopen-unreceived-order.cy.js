import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import testType from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';

describe('Orders', () => {
  const order = {
    ...NewOrder.defaultOngoingTimeOrder,
    approved: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const allocatedQuantity = '1000';
  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let location;
  const invoice = { ...NewInvoice.defaultUiInvoice };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          Helper.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
      effectiveLocationServicePoint = servicePoints[0];
      NewLocation.createViaApi(
        NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
      ).then((locationResponse) => {
        location = locationResponse;
        Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
          organization.id = organizationsResponse;
          order.vendor = organizationsResponse;
        });

        cy.visit(TopMenu.ordersPath);
        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList();
          Orders.createPOLineViaActions();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
          OrderLines.fillInPOLineInfoForPhysicalResourceWithPaymentNotRequired(
            defaultFund,
            '100',
            '1',
            '100',
            location.institutionId,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          cy.visit(TopMenu.invoicesPath);
          Invoices.createRolloverInvoice(invoice, organization.name);
          Invoices.createInvoiceLineFromPol(orderNumber);
          Invoices.approveInvoice();
          Invoices.payInvoice();
          cy.visit(TopMenu.ordersPath);
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.cancelOrder();
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
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
    'C358539 Unrelease encumbrances when reopen unreceived ongoing order with related paid invoice (Release encumbrance =true) (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderDetails.reOpenOrder({ orderNumber });
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
