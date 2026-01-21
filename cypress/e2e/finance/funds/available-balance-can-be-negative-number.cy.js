import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Budgets from '../../../support/fragments/finance/budgets/budgets';

describe('Finance', () => {
  describe('Funds', () => {
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger, restrictEncumbrance: false };
    const defaultFund = { ...Funds.defaultUiFund };
    const firstOrder = {
      ...NewOrder.defaultOngoingTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
    const defaultBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    let user;
    let location;

    before(() => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
        defaultFiscalYear.id = defaultFiscalYearResponse.id;
        defaultBudget.fiscalYearId = defaultFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            defaultBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(defaultBudget);
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
      'C374165 Available balance can be a negative number when ledger "Enforce all budget encumbrance limits" option is NOT active (Thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374165'] },
      () => {
        Orders.createApprovedOrderForRollover(firstOrder).then((firstOrderResponse) => {
          firstOrder.id = firstOrderResponse.id;
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
            defaultFund,
            '110',
            '1',
            '110',
            location.name,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          OrderLines.selectPOLInOrder(0);
          OrderLines.selectFund(`${defaultFund.name}(${defaultFund.code})`);
          Funds.selectBudgetDetails();
          Funds.checkBudgetQuantity1(`$${defaultBudget.allocated}`, '($10.00)');
        });
      },
    );
  });
});
