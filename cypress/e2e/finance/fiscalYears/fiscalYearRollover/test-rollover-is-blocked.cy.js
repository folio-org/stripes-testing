import uuid from 'uuid';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_2_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const thirdFiscalYear = {
    name: `autotest_3_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.get5DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get7DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      budget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      thirdFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '3';
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          budget.fundId = fundResponse.fund.id;
          cy.wait(2000);
          Budgets.createViaApi(budget);

          // Create second Fiscal Year for Rollover
          FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
            secondFiscalYear.id = secondFiscalYearResponse.id;
          });
          FiscalYears.createViaApi(thirdFiscalYear).then((thirdFiscalYearResponse) => {
            thirdFiscalYear.id = thirdFiscalYearResponse.id;
          });

          cy.getLocations({ limit: 1 }).then((res) => {
            location = res;

            cy.getDefaultMaterialType().then((mtype) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                // Prepare 2 Open Orders for Rollover
                Organizations.createOrganizationViaApi(organization).then(
                  (responseOrganizations) => {
                    organization.id = responseOrganizations;
                    defaultOrder.vendor = organization.id;
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 10.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 10.0,
                      },
                      fundDistribution: [
                        { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                      ],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtype.id,
                        materialSupplier: responseOrganizations,
                        volumes: [],
                      },
                    };
                    Orders.createOrderViaApi(defaultOrder).then((firstOrderResponse) => {
                      defaultOrder.id = firstOrderResponse.id;
                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      Orders.updateOrderViaApi({
                        ...firstOrderResponse,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                    });
                  },
                );
              });
            });
          });
        });
      });

      cy.loginAsAdmin({ path: TopMenu.ledgerPath, waiter: Ledgers.waitLoading });
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocation(
        secondFiscalYear.code,
        'None',
        'Allocation',
      );
      Ledgers.rollover();
      Ledgers.fillInRolloverForOneTimeOrdersWithAllocation(
        secondFiscalYear.code,
        'None',
        'Allocation',
      );
      cy.wait(3000);
    });

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui,
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
    'C402327 Test rollover is blocked once common rollover has been done for given ledger and FY (Thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C402327'] },
    () => {
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedgerAfterRollover(defaultLedger.name);
      Ledgers.closeRolloverInfo();
      Ledgers.rollover();
      Ledgers.fillInTestRolloverAndVarifyErrorForOneTimeOrdersWithAllocation(
        secondFiscalYear.code,
        'None',
        'Transfer',
        defaultLedger,
        firstFiscalYear.code,
      );
      cy.wait(2000);

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

      cy.visit(TopMenu.ledgerPath);
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocation(
        thirdFiscalYear.code,
        'None',
        'Allocation',
      );
      Ledgers.rollover();
      Ledgers.fillInRolloverForOneTimeOrdersWithAllocation(
        thirdFiscalYear.code,
        'None',
        'Allocation',
      );
      Ledgers.closeRolloverInfo();
      Ledgers.rollover();
      Ledgers.fillInTestRolloverAndVarifyErrorForOneTimeOrdersWithAllocation(
        thirdFiscalYear.code,
        'None',
        'Transfer',
        defaultLedger,
        secondFiscalYear.code,
      );
    },
  );
});
