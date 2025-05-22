import permissions from '../../../../support/dictionary/permissions';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const firstLedger = { ...Ledgers.defaultUiLedger };
  const secondLedger = {
    name: `autotest_ledger_2_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script',
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const thirdOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const allocatedQuantity = '100';
  const todayDate = DateTools.getCurrentDate();
  const fileNameDate = DateTools.getCurrentDateForFileNaming();
  let user;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = firstFiscalYear.id;
      secondLedger.fiscalYearOneId = firstFiscalYear.id;
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
      cy.getAdminToken();
      Ledgers.createViaApi(secondLedger).then((secondLedgerResponse) => {
        secondLedger.id = secondLedgerResponse.id;
        secondFund.ledgerId = secondLedger.id;

        Funds.createViaApi(secondFund).then((secondfundResponse) => {
          secondFund.id = secondfundResponse.fund.id;
          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(secondFund.name);
          Funds.selectFund(secondFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
        });
      });
    });

    cy.getLocations({ limit: 1 }).then((res) => {
      location = res;
    });

    FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
      secondFiscalYear.id = secondFiscalYearResponse.id;
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
    });
    thirdOrder.vendor = organization.name;
    secondOrder.vendor = organization.name;
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        firstFund,
        '10',
        '1',
        '10',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(secondOrder, true).then((secondOrderResponse) => {
      secondOrder.id = secondOrderResponse.id;
      Orders.checkCreatedOrder(secondOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 25);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        secondFund,
        '15',
        '1',
        '15',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.visit(TopMenu.ordersPath);

    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(thirdOrder, true).then((thirdOrderResponse) => {
      thirdOrder.id = thirdOrderResponse.id;
      Orders.checkCreatedOrder(thirdOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 35);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWith2Funds(
        firstFund,
        '10',
        '5',
        '30',
        secondFund,
        '40',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C398023 Test rollover when PO line contains two fund distributions related to different ledgers and same fiscal year (Thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      FinanceHelp.searchByName(firstLedger.name);
      Ledgers.selectLedger(firstLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocation(
        secondFiscalYear.code,
        'None',
        'Allocation',
      );
      Ledgers.rolloverLogs();
      Ledgers.exportRolloverError(todayDate);
      Ledgers.checkDownloadedErrorFile(
        `${fileNameDate}-error.csv`,
        'Order',
        'Create encumbrance',
        '30',
        firstFund.id,
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-error.csv`);
      Ledgers.exportRollover(todayDate);
      Ledgers.checkDownloadedFileWithAllTansactions(
        `${fileNameDate}-result.csv`,
        firstFund,
        secondFiscalYear,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '40',
        '0',
        '0',
        '40',
        '0',
        '0',
        '100',
        '60',
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
      Ledgers.closeOpenedPage();
      FinanceHelp.searchByName(secondLedger.name);
      Ledgers.selectLedger(secondLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocation(
        secondFiscalYear.code,
        'None',
        'Allocation',
      );
      Ledgers.rolloverLogs();
      Ledgers.exportRolloverError(todayDate);
      Ledgers.checkDownloadedErrorFile(
        `${fileNameDate}-error.csv`,
        'Order',
        'Create encumbrance',
        '20',
        secondFund.id,
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-error.csv`);
      Ledgers.exportRollover(todayDate);
      Ledgers.checkDownloadedFileWithAllTansactions(
        `${fileNameDate}-result.csv`,
        secondFund,
        secondFiscalYear,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '35',
        '0',
        '0',
        '35',
        '0',
        '0',
        '100',
        '65',
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
    },
  );
});
