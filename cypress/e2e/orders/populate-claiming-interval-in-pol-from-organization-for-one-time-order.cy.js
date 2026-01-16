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
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    claimingInterval: 20,
  };
  const allocatedQuantity = '100';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    }, 20_000);
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
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
    });

    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
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
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    Orders.deleteOrderViaApi(firstOrder.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();

    Funds.deleteFundViaApi(defaultFund.id);

    Ledgers.deleteLedgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C423438 Populate claiming interval in PO line from Organization record for one-time order (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C423438'] },
    () => {
      Orders.resetFiltersIfActive();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.fillInPOLineInfoForPhysicalResourceWithPaymentNotRequired(
        defaultFund,
        '20',
        '1',
        '20',
        location.name,
      );
      OrderLines.checkClaimingIntervalInPOL('20');
      OrderLines.editPOLInOrder();
      OrderLines.claimingActiveAndSetInterval('35');
      OrderLines.saveOrderLine();
      OrderLines.checkClaimingIntervalInPOL('35');
      OrderLines.editPOLInOrder();
      OrderLines.claimingActive();
      OrderLines.saveOrderLine();
      OrderLines.checkClaimingIntervalInPOL('No value set-');
    },
  );
});
