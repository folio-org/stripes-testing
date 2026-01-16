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
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import Organizations from '../../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import { TransactionDetails } from '../../../support/fragments/finance';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
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
    const ledger1 = { ...Ledgers.defaultUiLedger };
    const ledger2 = {
      ...Ledgers.defaultUiLedger,
      name: `autotest_ledger_2_${getRandomPostfix()}`,
      code: `test_automation_code_2_${getRandomPostfix()}`,
    };
    const fundA = { ...Funds.defaultUiFund };
    const fundB = {
      ...Funds.defaultUiFund,
      name: `autotest_fund_${getRandomPostfix()}_2`,
      code: `${getRandomPostfix()}_2`,
    };
    const budget1 = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const budget2 = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const order = {
      id: uuid(),
      orderType: 'One-Time',
      reEncumber: false,
      approved: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    let location;
    let orderNumber;
    const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
    const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
    const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
    const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

    before('Create user, fiscal years, ledgers, funds, and order', () => {
      cy.loginAsAdmin({
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });

      FiscalYears.createViaApi(firstFiscalYear).then((fiscalYearOneResponse) => {
        firstFiscalYear.id = fiscalYearOneResponse.id;
        ledger1.fiscalYearOneId = firstFiscalYear.id;
        budget1.fiscalYearId = fiscalYearOneResponse.id;
        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        FiscalYears.createViaApi(secondFiscalYear).then((fiscalYearTwoResponse) => {
          secondFiscalYear.id = fiscalYearTwoResponse.id;
          ledger2.fiscalYearOneId = fiscalYearTwoResponse.id;
          budget2.fiscalYearId = fiscalYearTwoResponse.id;
          Ledgers.createViaApi(ledger1).then((ledgerId) => {
            ledger1.id = ledgerId.id;
            fundA.ledgerId = ledgerId.id;
            Funds.createViaApi(fundA).then((fundId) => {
              fundA.id = fundId.fund.id;
              budget1.fundId = fundId.fund.id;
              Budgets.createViaApi(budget1);
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
                          fundDistribution: [{ code: fundA.code, fundId: fundA.id, value: 100 }],
                          locations: [
                            { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                          ],
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
              Ledgers.searchByName(ledger1.name);
              Ledgers.selectLedger(ledger1.name);
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

          Ledgers.createViaApi(ledger2).then((ledgerId) => {
            ledger2.id = ledgerId.id;
            fundB.ledgerId = ledgerId.id;
            Funds.createViaApi(fundB).then((fundId) => {
              fundB.id = fundId.fund.id;
              budget2.fundId = fundId.fund.id;
              Budgets.createViaApi(budget2);
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
      'C451639 Fund can be added to Fund distribution of PO line after rollover (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C451639'] },
      () => {
        Orders.resetFiltersIfActive();
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.selectPOLInOrder();
        OrderLines.editPOLInOrder();
        OrderLines.changePercentsValueInFundDistribution('50');
        OrderLines.addFundToPOLWithoutSave(1, fundB, '50');
        OrderLines.saveOrderLine();
        cy.visit(TopMenu.financePath);
        Funds.searchByName(fundA.name);
        Funds.selectFund(fundA.name);
        Funds.selectPreviousBudgetDetails();
        Funds.openTransactions();
        Funds.selectTransactionInList('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: firstFiscalYear.code },
            { key: 'Amount', value: '($100.00)' },
            { key: 'Source', value: `${orderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: `${fundA.name} (${fundA.code})` },
            { key: 'Initial encumbrance', value: '$100.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
        Funds.closeBudgetTransactionApp(budget1.name);
        Funds.closeBudgetDetails();
        Funds.searchByName(fundB.name);
        Funds.selectFund(fundB.name);
        Funds.selectBudgetDetails();
        Funds.openTransactions();
        Funds.selectTransactionInList('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: secondFiscalYear.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Source', value: `${orderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: `${fundB.name} (${fundB.code})` },
            { key: 'Initial encumbrance', value: '$0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
      },
    );
  });
});
