import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import Transactions from '../../support/fragments/finance/transactions/transactions';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import orderLines from '../../support/fragments/orders/orderLines';
import { TransactionDetails } from '../../support/fragments/finance';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      first: {},
      second: {},
    },
    budgets: {
      first: {},
      second: {},
    },
    expenseClass: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createExpenseClass = () => {
    const expenseClass = ExpenseClasses.getDefaultExpenseClass();
    return ExpenseClasses.createExpenseClassViaApi(expenseClass).then((response) => {
      testData.expenseClass = response;
    });
  };

  const createFundWithBudget = (ledgerId, fiscalYearId, withExpenseClass = false) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 1000,
      };

      if (withExpenseClass) {
        budget.statusExpenseClasses = [{ expenseClassId: testData.expenseClass.id }];
      }

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        purchaseOrderId: orderResponse.id,
        cost: {
          listUnitPrice: 100.0,
          currency: 'USD',
          discountType: 'percentage',
          quantityPhysical: 1,
          poLineEstimatedPrice: 100.0,
        },
        fundDistribution: [
          {
            code: testData.funds.first.code,
            fundId: testData.funds.first.id,
            expenseClassId: testData.expenseClass.id,
            distributionType: 'percentage',
            value: 100,
          },
        ],
        locations: [
          {
            locationId,
            quantity: 1,
            quantityPhysical: 1,
          },
        ],
        acquisitionMethod: acquisitionMethodId,
        physical: {
          createInventory: 'Instance, Holding, Item',
          materialType: materialTypeId,
          materialSupplier: testData.organization.id,
          volumes: [],
        },
      };

      return orderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return createExpenseClass().then(() => {
          return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id, true).then(
            (firstFundData) => {
              testData.funds.first = firstFundData.fund;
              testData.budgets.first = firstFundData.budget;

              return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id, false).then(
                (secondFundData) => {
                  testData.funds.second = secondFundData.fund;
                  testData.budgets.second = secondFundData.budget;
                },
              );
            },
          );
        });
      });
    });
  };

  const createOrderData = () => {
    testData.organization = NewOrganization.defaultUiOrganizations;

    return Organizations.createOrganizationViaApi(testData.organization).then(
      (organizationResponse) => {
        testData.organization.id = organizationResponse;

        return ServicePoints.getViaApi().then((servicePoint) => {
          return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
            (locationResponse) => {
              testData.location = locationResponse;

              return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
                return cy
                  .getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                  })
                  .then((acquisitionMethod) => {
                    return createOrderWithLine(
                      locationResponse.id,
                      materialType.id,
                      acquisitionMethod.body.acquisitionMethods[0].id,
                    );
                  });
              });
            },
          );
        });
      },
    );
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.uiOrdersEdit.gui,
          permissions.uiOrdersView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.getBudgetViaApi({ query: `id=="${testData.budgets.first.id}"` }).then(
        (budgetResponse) => {
          Budgets.updateBudgetViaApi({
            ...budgetResponse.budgets[0],
            statusExpenseClasses: [],
          }).then(() => {
            ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass.id);
            Budgets.deleteViaApi(testData.budgets.first.id);
            Budgets.deleteViaApi(testData.budgets.second.id);
            Funds.deleteFundViaApi(testData.funds.first.id);
            Funds.deleteFundViaApi(testData.funds.second.id);
            Ledgers.deleteLedgerViaApi(testData.ledger.id);
            FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
          });
        },
      );
    });
  });

  it(
    'C357539 Encumbrance transaction updates when fund name is changing in Open one-time order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C357539', 'shiftLeft'] },
    () => {
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openOrderLineEditForm();
      orderLines.changeFundInPOL(testData.funds.second);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.second.name,
          expenseClass: '-',
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '$100.00',
          currentEncumbrance: '$100.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.funds.second.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$100.00' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.funds.second.name },
          { key: 'Initial encumbrance', value: '$100.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      Funds.waitLoading();
      FinanceHelp.searchByName(testData.funds.first.name);
      Funds.selectFund(testData.funds.first.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Transactions.checkTransactionsList({
        records: [{ type: 'Encumbrance' }],
        present: false,
      });
    },
  );
});
