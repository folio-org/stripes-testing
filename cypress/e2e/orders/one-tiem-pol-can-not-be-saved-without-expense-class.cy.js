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
import NewExpenseClass from '../../support/fragments/settings/finance/newExpenseClass';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsFinance from '../../support/fragments/settings/finance/settingsFinance';

describe('Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    orderType: 'One-time',
  };
  const firstExpenseClass = {
    ...NewExpenseClass.defaultUiBatchGroup,
  };

  const secondExpenseClass = {
    ...NewExpenseClass.defaultUiBatchGroup,
    name: `AT_Class_${getRandomPostfix()}_1`,
    code: `${getRandomPostfix()}_1`,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const allocatedQuantity = '100';
  let user;
  let servicePointId;
  let location;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.settingsFinanceExpenseClassesPath,
      waiter: SettingsFinance.waitExpenseClassesLoading,
      authRefresh: true,
    });

    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          SettingsFinance.createNewExpenseClass(firstExpenseClass);
          SettingsFinance.createNewExpenseClass(secondExpenseClass);
          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addTwoExpensesClass(firstExpenseClass.name, secondExpenseClass.name);
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
    order.vendor = organization.name;

    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
        authRefresh: true,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: TopMenu.fundPath,
      waiter: Funds.waitLoading,
    });
    FinanceHelp.clickFundButton();
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.editBudget();
    Funds.deleteAllExpenseClasses();
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();
    cy.visit(TopMenu.settingsFinanceExpenseClassesPath);
    SettingsFinance.deleteExpenseClass(firstExpenseClass);
    SettingsFinance.deleteExpenseClass(secondExpenseClass);
    Orders.deleteOrderViaApi(order.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C402773 PO line for "One-time" order can not be saved when "Expense class" field is empty (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C402773'] },
    () => {
      Orders.createApprovedOrderForRollover(order, true).then((firstOrderResponse) => {
        order.id = firstOrderResponse.id;
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.fillInPOLineInfoforPhysicalMaterialWithFundWithoutECAndCheckRequiredField(
          defaultFund,
          '20',
          '1',
          '20',
          location.name,
        );
      });
    },
  );
});
