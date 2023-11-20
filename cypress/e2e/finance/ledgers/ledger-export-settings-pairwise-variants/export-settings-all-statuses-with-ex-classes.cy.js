import permissions from '../../../../support/dictionary/permissions';
import testType from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../../support/fragments/topMenu';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../../support/fragments/users/users';
import Funds from '../../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import DateTools from '../../../../support/utils/dateTools';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import Orders from '../../../../support/fragments/orders/orders';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Organizations from '../../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';

describe('Finance: Ledgers', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let servicePointId;
  let location;
  let fileName;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addTwoExpensesClass('Electronic', 'Print');
        });
      });
      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;
        });
        // Create second Fiscal Year for Rollover
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
        });
        // Prepare Open Order for Rollover
        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
        });
        firstOrder.vendor = organization.name;
        secondOrder.vendor = organization.name;
        cy.visit(TopMenu.ordersPath);
        Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
          firstOrder.id = firstOrderResponse.id;
          Orders.checkCreatedOrder(firstOrder);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 35);
          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFundAndExpClass(
            defaultFund,
            'Electronic',
            '10',
            '1',
            '10',
            location.institutionId,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
        });
        Orders.createApprovedOrderForRollover(secondOrder, true).then((secondOrderResponse) => {
          secondOrder.id = secondOrderResponse.id;
          Orders.checkCreatedOrder(secondOrder);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 35);
          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFundAndExpClass(
            defaultFund,
            'Print',
            '10',
            '1',
            '10',
            location.institutionId,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
        });
        cy.visit(TopMenu.fundPath);
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.selectBudgetDetails();
        Funds.editBudget();
        Funds.changeStatusOfExpClass(1, 'Inactive');
        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInRolloverForOneTimeOrdersWithAllocation(
          secondFiscalYear.code,
          'None',
          'Allocation',
        );
        cy.visit(TopMenu.fiscalYearPath);
        FinanceHelp.searchByName(firstFiscalYear.name);
        FiscalYears.selectFY(firstFiscalYear.name);
        FiscalYears.editFiscalYearDetails();
        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
          periodStartForFirstFY,
          periodEndForFirstFY,
        );
        FinanceHelp.searchByName(secondFiscalYear.name);
        FiscalYears.selectFY(secondFiscalYear.name);
        FiscalYears.editFiscalYearDetails();
        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
          periodStartForSecondFY,
          periodEndForSecondFY,
        );
        fileName = `Export-${defaultLedger.code}-${secondFiscalYear.code}`;
      });
    });
    cy.createTempUser([
      permissions.uiFinanceExportFinanceRecords.gui,
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
    'C350975: Ledger export settings: last year Fund with budget, Print (Active) and Electronic (Inactive) Classes, Export settings- All statuses (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(secondFiscalYear.code, 'All', defaultLedger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(`${fileName}.csv`);
      cy.pause();
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
        `${fileName}.csv`,
        1,
        defaultFund,
        secondFiscalYear,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '20',
        '0',
        '0',
        '20',
        '0',
        '0',
        '100',
        '80',
        'Electronic',
        'Elec',
        'Active',
        '10',
        '0',
        '0',
      );
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
        `${fileName}.csv`,
        2,
        defaultFund,
        secondFiscalYear,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '20',
        '0',
        '0',
        '20',
        '0',
        '0',
        '100',
        '80',
        'Print',
        'Prn',
        'Inactive',
        '10',
        '0',
        '0',
      );
      Ledgers.deleteDownloadedFile(`${fileName}.csv`);
    },
  );
});
