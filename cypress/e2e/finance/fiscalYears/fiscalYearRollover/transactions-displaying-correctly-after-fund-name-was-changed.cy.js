import uuid from 'uuid';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { TransactionDetails } from '../../../../support/fragments/finance';

describe('Fiscal Year Rollover', () => {
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
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.defaultOngoingTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const secondBudget = {
    id: uuid(),
    name: `autotest_budget_${getRandomPostfix()}`,
    allocated: 100,
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
    budgetStatus: 'Active',
  };
  let user;
  let location;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            firstFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
          });

          // Create second Fiscal Year for Rollover
          FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
            secondFiscalYear.id = secondFiscalYearResponse.id;
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
                    firstOrder.vendor = organization.id;
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
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                    Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                      firstOrder.id = firstOrderResponse.id;
                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                      orderNumber = firstOrderResponse.poNumber;
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
    });
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersView.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C357565 Transactions are displaying correctly after rollover when fund name was changed in POL after opening order (Thunderjet) (TaaS)',
    { tags: ['extendedPathFlaky', 'thunderjet', 'C357565'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.deleteFundInPOLwithoutSave();
      OrderLines.changePhysicalUnitPrice('70');
      OrderLines.addFundToPolInPercentsWithoutSave(secondFund, '100');
      OrderLines.saveOrderLine();
      OrderLines.selectFund(`${secondFund.name}(${secondFund.code})`);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: firstFiscalYear.code },
          { key: 'Amount', value: '($70.00)' },
          { key: 'Source', value: `${orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${secondFund.name} (${secondFund.code})` },
          { key: 'Initial encumbrance', value: '$70.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.closeBudgetTransactionApp(secondBudget.name);
      Funds.closeBudgetDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      cy.visit(TopMenu.ledgerPath);
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrancesLimits(
        secondFiscalYear.code,
        'None',
        'Transfer',
      );
      cy.wait(5000);
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name);
      Funds.selectPlannedBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: secondFiscalYear.code },
          { key: 'Amount', value: '($70.00)' },
          { key: 'Source', value: `${orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${secondFund.name} (${secondFund.code})` },
          { key: 'Initial encumbrance', value: '$70.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      Funds.closeTransactionApp(secondFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectPlannedBudgetDetails();
      Funds.openTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openPageCurrentEncumbrance('$70.00');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: secondFiscalYear.code },
          { key: 'Amount', value: '($70.00)' },
          { key: 'Source', value: `${orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${secondFund.name} (${secondFund.code})` },
          { key: 'Initial encumbrance', value: '$70.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
