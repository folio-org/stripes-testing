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
import Invoices from '../../../support/fragments/invoices/invoices';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-orders: Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultOrder = {
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  const todayDate = DateTools.getCurrentDate();
  const fileNameDate = DateTools.getCurrentDateForFileNaming();
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            firstFund.ledgerId = defaultLedger.id;
            secondFund.ledgerId = defaultLedger.id;

            Funds.createViaApi(firstFund)
              .then(fundResponse => {
                firstFund.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(firstFund.name);
                Funds.selectFund(firstFund.name);
                Funds.addBudget(allocatedQuantity);
              });

            Funds.createViaApi(secondFund)
              .then(secondFundResponse => {
                secondFund.id = secondFundResponse.fund.id;

                cy.visit(TopMenu.fundPath);
                FinanceHelp.searchByName(secondFund.name);
                Funds.selectFund(secondFund.name);
                Funds.addBudget(allocatedQuantity);
              });
          });
      });

    ServicePoints.getViaApi()
      .then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
          .then(res => {
            location = res;
          });
      });

    // Prepare 2 Open Orders for Rollover
    Organizations.createOrganizationViaApi(organization)
      .then(responseOrganizations => {
        organization.id = responseOrganizations;
        invoice.accountingCode = organization.erpCode;
        defaultOrder.orderType = 'One-time';
      });
    secondOrder.vendor = organization.name;
    defaultOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(secondOrder).then(firstOrderResponse => {
      secondOrder.id = firstOrderResponse.id;
      firstOrderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(secondOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(defaultFund, '40', '1', '40', location.institutionId);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderForRollover(defaultOrder).then(secondOrderResponse => {
        defaultOrder.id = secondOrderResponse.id;
        Orders.checkCreatedOrder(defaultOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(defaultFund, '10', '1', '10', location.institutionId);
        OrderLines.backToEditingOrder();
        Orders.openOrder();
      });
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(firstOrderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    });
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.ledgerPath, waiter: Ledgers.waitForLedgerDetailsLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C375290 Editing fund distribution and increasing cost in PO line when related Paid invoice exists (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(defaultLedger.name);
    Ledgers.selectLedger(defaultLedger.name);
    Ledgers.rollover();
    Ledgers.fillInTestRolloverInfoCashBalance(secondFiscalYear.code, 'Cash balance', 'Allocation');
    Ledgers.rolloverLogs();
    Ledgers.exportRollover(todayDate);
    Ledgers.checkDownloadedFile(`${fileNameDate}-result.csv`, defaultFund, secondFiscalYear, '100', '100', '160', '160', '160', '160', '160');
    Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
    Ledgers.closeOpenedPage();
    Ledgers.rollover();
    Ledgers.fillInRolloverForCashBalance(secondFiscalYear.code, 'Cash balance', 'Allocation');
    Ledgers.closeRolloverInfo();
    Ledgers.selectFundInLedger(defaultFund.name);
    Funds.selectPlannedBudgetDetails();
    Funds.checkFundingInformation('$160.00','$0.00','$0.00','$160.00','$0.00','$160.00');
    Funds.checkFinancialActivityAndOverages('$0.00','$0.00','$0.00','$0.00');
  });
});
