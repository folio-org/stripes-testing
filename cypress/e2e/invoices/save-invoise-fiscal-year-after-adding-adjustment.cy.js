import { Permissions } from '../../support/dictionary';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_2_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const thirdFiscalYear = {
    name: `autotest_3_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get5DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get7DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: false,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.get3DaysAfterTomorrowDateForFiscalYearOnUIEdit();
  const periodStartForThirdFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForThirdFY = DateTools.get3DaysAfterTomorrowDateForFiscalYearOnUIEdit();
  const adjustmentDescription = `test_description${getRandomPostfix()}`;
  const barcode = FinanceHelp.getRandomBarcode();
  const enumeration = 'autotestCaption';
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    }, 20_000);

    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
          Funds.closeFundDetails();
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
        Orders.resetFiltersIfActive();
        Orders.createApprovedOrderForRollover(defaultOrder, true, true).then(
          (firstOrderResponse) => {
            defaultOrder.id = firstOrderResponse.id;
            orderNumber = firstOrderResponse.poNumber;
            OrderLines.addPOLine();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
            OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
              defaultFund,
              '25',
              '1',
              '25',
              location.name,
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
            Orders.receiveOrderViaActions();
            Receiving.selectLinkFromResultsList();
            Receiving.receivePiece(0, enumeration, barcode);
            Receiving.checkReceivedPiece(0, enumeration, barcode);
          },
        );

        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        thirdFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '3';
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
        });

        FiscalYears.createViaApi(thirdFiscalYear).then((thirdFiscalYearResponse) => {
          thirdFiscalYear.id = thirdFiscalYearResponse.id;
        });

        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutCheckboxOneTimeOrders(
          secondFiscalYear.code,
          'None',
          'Allocation',
        );
      });
    });

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

    cy.createTempUser([
      Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceViewLedger.gui,
      Permissions.uiFinanceViewEditFiscalYear.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      }, 20_000);
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C396373 Save invoice fiscal year after adding adjustment on invoice level if FY was undefined and pay against previous FY (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C396373'] },
    () => {
      Invoices.createRolloverInvoiceWithAjustmentAndFund(
        invoice,
        organization.name,
        adjustmentDescription,
        '10',
        '$',
        'Not prorated',
        'In addition to',
        false,
        defaultFund,
      );
      Invoices.editInvoice();
      Invoices.changeFY(firstFiscalYear.code);
      Invoices.createInvoiceLineFromPol(orderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($25.00)',
        `${orderNumber}-1`,
        'Pending payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );

      cy.visit(TopMenu.financePath);
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInRolloverWithoutCheckboxCloseBudgetsOneTimeOrders(
        thirdFiscalYear.code,
        'None',
        'Allocation',
      );

      cy.visit(TopMenu.fiscalYearPath);
      FinanceHelp.searchByName(secondFiscalYear.name);
      FiscalYears.selectFY(secondFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForFirstFY,
        periodEndForFirstFY,
      );
      FinanceHelp.searchByName(thirdFiscalYear.name);
      FiscalYears.selectFY(thirdFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForThirdFY,
        periodEndForThirdFY,
      );

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($25.00)',
        `${orderNumber}-1`,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetailsByFY(defaultFund, secondFiscalYear);
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
      Funds.closeTransactionApp(defaultFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Allocation');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
    },
  );
});
