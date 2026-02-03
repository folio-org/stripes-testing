import permissions from '../../support/dictionary/permissions';
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
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: true,
    restrictExpenditures: true,
  };
  const secondLedger = {
    name: `autotest_2_ledger_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script',
    restrictEncumbrance: true,
    restrictExpenditures: true,
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_2_fund_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading, authRefresh: true });
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      cy.getBatchGroups().then((batchGroup) => {
        invoice.batchGroup = batchGroup.name;
      });
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        firstLedger.fiscalYearOneId = firstFiscalYear.id;
        secondLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
          firstLedger.id = ledgerResponse.id;
          firstFund.ledgerId = firstLedger.id;

          Funds.createViaApi(firstFund).then((firstFundResponse) => {
            firstFund.id = firstFundResponse.fund.id;

            FinanceHelp.searchByName(firstFund.name);
            Funds.selectFund(firstFund.name);
            Funds.addBudget(allocatedQuantity);
            Funds.closeBudgetDetails();
          });

          Ledgers.createViaApi(secondLedger).then((secondLedgerResponse) => {
            secondLedger.id = secondLedgerResponse.id;
            secondFund.ledgerId = secondLedger.id;

            Funds.createViaApi(secondFund).then((secondFundResponse) => {
              secondFund.id = secondFundResponse.fund.id;
              FinanceHelp.searchByName(secondFund.name);
              Funds.selectFund(secondFund.name);
              Funds.addBudget(allocatedQuantity);
            });

            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;
                },
              );
            });

            defaultOrder.vendor = organization.name;
            cy.visit(TopMenu.ordersPath);
            Orders.createApprovedOrderForRollover(defaultOrder, true, false).then(
              (firstOrderResponse) => {
                defaultOrder.id = firstOrderResponse.id;
                orderNumber = firstOrderResponse.poNumber;
                OrderLines.addPOLine();
                OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
                OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
                  firstFund,
                  '10',
                  '1',
                  '10',
                  location.name,
                );
                OrderLines.backToEditingOrder();
                Orders.openOrder();

                secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
                FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
                  secondFiscalYear.id = secondFiscalYearResponse.id;
                });
              },
            );
          });
        });
      });

      cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiInvoicesApproveInvoices.gui,
        permissions.viewEditCreateInvoiceInvoiceLine.gui,
        permissions.uiInvoicesPayInvoices.gui,
        permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C396390 Fiscal year appears after fund distribution change when FY was undefined (for previous FY) (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C396390'] },
    () => {
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      Invoices.editInvoice();
      Invoices.checkAbsentFYOptionInInvoice(secondFiscalYear.code);
      Invoices.cancelEditInvoice();
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.changeFundInLine(secondFund);
    },
  );
});
