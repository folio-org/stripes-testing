import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import DateTools from '../../../support/utils/dateTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-finance: Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FYTA',
  };
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
  const todayDate = DateTools.getCurrentDate();
  const allocatedQuantityForCurrentBudget = '1000';
  const allocatedQuantityForPlannedBudget = '500';
  const fileNameDate = DateTools.getCurrentDateForFileNaming();
  let user;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
        });
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantityForCurrentBudget);
          Funds.closeBudgetDetails();
          Funds.addPlannedBudget(allocatedQuantityForPlannedBudget, secondFiscalYear.code);
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
      invoice.accountingCode = organization.erpCode;
    });
    defaultOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(defaultOrder, true, false).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '150',
        '1',
        '150',
        location.institutionId,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
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
    'C366540 Test and common rollover are executed successfully when "Planned budget" was created by user (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverInfoForOngoingOrdersWithoutAllocations(
        secondFiscalYear.code,
        'None',
        'Transfer',
      );
      Ledgers.rolloverLogs();
      Ledgers.exportRollover(todayDate);
      Ledgers.checkDownloadedFile(
        `${fileNameDate}-result.csv`,
        defaultFund,
        secondFiscalYear,
        '100',
        '100',
        '500',
        '500',
        '500',
        '500',
        '350',
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
      Ledgers.closeOpenedPage();
      Ledgers.selectFundInLedger(defaultFund.name);
      Funds.selectPlannedBudgetDetails();
      Funds.checkBudgetQuantity1(
        allocatedQuantityForPlannedBudget,
        allocatedQuantityForPlannedBudget,
      );
      cy.visit(TopMenu.ledgerPath);
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInRolloverInfoForOngoingOrdersWithoutAllocations(
        secondFiscalYear.code,
        'None',
        'Transfer',
      );
      Ledgers.closeRolloverInfo();
      Ledgers.selectFundInLedger(defaultFund.name);
      Funds.selectPlannedBudgetDetails();
      Funds.checkBudgetQuantity1(allocatedQuantityForPlannedBudget, '350');
    },
  );
});
