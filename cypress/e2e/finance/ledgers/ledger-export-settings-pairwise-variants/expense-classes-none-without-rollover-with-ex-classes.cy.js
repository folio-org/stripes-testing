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
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Finance: Ledgers', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
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
        fileName = `Export-${defaultLedger.code}-${firstFiscalYear.code}`;
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
    'C353205: Ledger export settings: current year Fund with budget, Print (Active) and Economic (Inactive) Classes, Export settings-None statuses (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(firstFiscalYear.code, 'None', defaultLedger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFile(`${fileName}.csv`);
      Ledgers.checkColumnContentInDownloadedLedgerExportFile(
        `${fileName}.csv`,
        1,
        defaultFund,
        firstFiscalYear,
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
      );
      Ledgers.deleteDownloadedFile(`${fileName}.csv`);
    },
  );
});
