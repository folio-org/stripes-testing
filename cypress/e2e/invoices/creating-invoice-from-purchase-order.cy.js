import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '1000';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
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

    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      cy.getBatchGroups().then((batchGroup) => {
        invoice.batchGroup = batchGroup.name;
      });
    });
    defaultOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(defaultOrder).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '100',
        '1',
        '100',
        location.institutionId,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });
    cy.createTempUser([
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiOrdersView.gui,
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
    'C357056 Creating invoice from purchase order (thunderjet)',
    { tags: [testType.extendedPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrderWithoutFY(invoice);
    },
  );
});
