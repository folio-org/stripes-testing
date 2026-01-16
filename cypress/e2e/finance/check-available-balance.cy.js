import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Groups from '../../support/fragments/finance/groups/groups';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Finance', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger, restrictEncumbrance: false };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const defaultGroup = { ...Groups.defaultUiGroup };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '1000';
  let user;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Groups.createViaApi(defaultGroup).then((firstGroupResponse) => {
          defaultGroup.id = firstGroupResponse.id;
        });
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
          Funds.addGroupToFund(defaultGroup.name);
          InteractorsTools.checkCalloutMessage('Fund has been saved');
        });
      });
    });
    cy.getAdminToken();
    cy.getLocations({ limit: 1 }).then((res) => {
      location = res;
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
    });
    defaultOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(defaultOrder, true).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '1100',
        '1',
        '1100',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });
    cy.createTempUser([
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitForFiscalYearDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C377030 "Available balance" is displayed as a negative number when running a deficit (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C377030'] },
    () => {
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.checkAvailableBalance('$1,000.00', '($100.00)');
      FiscalYears.clickOnLedgerTab();
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      FiscalYears.checkAvailableBalance('$1,000.00', '($100.00)');
      Ledgers.clickOnFundTab();
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      FiscalYears.checkAvailableBalance('$1,000.00', '($100.00)');
    },
  );
});
