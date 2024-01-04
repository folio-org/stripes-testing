import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Finance: Funds', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = { ...Ledgers.defaultUiLedger, restrictEncumbrance: false };
  const firstFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOngoingTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  const allocatedQuantity = '100';
  let user;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
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
    });
    firstOrder.vendor = organization.name;

    cy.createTempUser([
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
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
    'C374165: Available balance can be a negative number when ledger "Enforce all budget encumbrance limits" option is NOT active (Thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Orders.createApprovedOrderForRollover(firstOrder).then((firstOrderResponse) => {
        firstOrder.id = firstOrderResponse.id;
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          firstFund,
          '110',
          '1',
          '110',
          location.institutionId,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.selectFund(`${firstFund.name}(${firstFund.code})`);
        Funds.selectBudgetDetails();
        Funds.checkBudgetQuantity1(`$${allocatedQuantity}`, '-$10.00');
      });
    },
  );
});
