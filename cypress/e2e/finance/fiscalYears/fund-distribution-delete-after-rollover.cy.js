import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Orders from '../../../support/fragments/orders/orders';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import Organizations from '../../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Budgets from '../../../support/fragments/finance/budgets/budgets';

describe('Finance › Fiscal Year Rollover', () => {
  let user;
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const order = {
    id: uuid(),
    orderType: 'One-Time',
    reEncumber: false,
    approved: true,
  };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let location;
  let orderNumber;
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  before('Create user, fiscal years, ledger, fund, and order', () => {
    cy.loginAsAdmin({
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });

    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      defaultBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      FiscalYears.createViaApi(secondFiscalYear).then((fiscalYearId) => {
        secondFiscalYear.id = fiscalYearId.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerId) => {
          defaultLedger.id = ledgerId.id;
          defaultFund.ledgerId = ledgerId.id;
          Funds.createViaApi(defaultFund).then((fundId) => {
            defaultFund.id = fundId.fund.id;
            defaultBudget.fundId = fundId.fund.id;
            Budgets.createViaApi(defaultBudget);

            cy.getLocations({ limit: 1 }).then((res) => {
              location = res;
              cy.getDefaultMaterialType().then((mtype) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      order.vendor = organization.id;
                      const orderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 100.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 100.0,
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

                      Orders.createOrderViaApi(order).then((orderResponse) => {
                        order.id = orderResponse.id;
                        orderNumber = orderResponse.poNumber;
                        orderLine.purchaseOrderId = orderResponse.id;

                        OrderLines.createOrderLineViaApi(orderLine);
                        Orders.updateOrderViaApi({
                          ...orderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });
                    },
                  );
                });
              });
            });

            Ledgers.searchByName(defaultLedger.name);
            Ledgers.selectLedger(defaultLedger.name);
            Ledgers.rollover();
            Ledgers.fillInRolloverWithoutCheckboxCloseBudgetsOneTimeOrders(
              secondFiscalYear.code,
              'None',
              'Transfer',
            );
            FinanceHelp.selectFiscalYearsNavigation();
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
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiOrdersEdit.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C451634 Fund distribution of PO line can be deleted after rollover (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451634'] },
    () => {
      Orders.resetFiltersIfActive();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.openPageCurrentEncumbranceInFund(
        `${defaultFund.name}(${defaultFund.code})`,
        '$0.00',
      );
      Funds.checkStatusInTransactionDetails('Released');
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.deleteFundsInPOL();
      OrderLines.saveOrderLine();
      cy.visit(TopMenu.financePath);
      Funds.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectPreviousBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$100.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
