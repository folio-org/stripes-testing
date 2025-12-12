import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import { TransactionDetails } from '../../support/fragments/finance';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    expenseClasses: {
      first: {},
      second: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createExpenseClasses = () => {
    const firstExpenseClass = {
      ...ExpenseClasses.getDefaultExpenseClass(),
      code: `EC1_${getRandomPostfix()}`,
    };
    const secondExpenseClass = {
      ...ExpenseClasses.getDefaultExpenseClass(),
      code: `EC2_${getRandomPostfix()}`,
    };

    return ExpenseClasses.createExpenseClassViaApi(firstExpenseClass).then((response1) => {
      testData.expenseClasses.first = response1;

      return ExpenseClasses.createExpenseClassViaApi(secondExpenseClass).then((response2) => {
        testData.expenseClasses.second = response2;
      });
    });
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      testData.fund = fundResponse.fund;

      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 1000,
        statusExpenseClasses: [
          { expenseClassId: testData.expenseClasses.first.id },
          { expenseClassId: testData.expenseClasses.second.id },
        ],
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        testData.budget = budgetResponse;
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
            code: testData.fund.code,
            fundId: testData.fund.id,
            expenseClassId: testData.expenseClasses.first.id,
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

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
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
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return createExpenseClasses().then(() => {
          return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id);
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

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
    });
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
      Budgets.getBudgetViaApi({ query: `id=="${testData.budget.id}"` }).then((budgetResponse) => {
        Budgets.updateBudgetViaApi({
          ...budgetResponse.budgets[0],
          statusExpenseClasses: [],
        }).then(() => {
          ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClasses.first.id);
          ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClasses.second.id);
          Budgets.deleteViaApi(testData.budget.id);
          Funds.deleteFundViaApi(testData.fund.id);
          Ledgers.deleteLedgerViaApi(testData.ledger.id);
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        });
      });
    });
  });

  it(
    'C451475 Expense class of transaction is updated correctly when Expense class of Fund distribution is changed in POL (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451475'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '$100.00',
          currentEncumbrance: '$100.00',
        },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.changeExpenseClassInPOLWithoutSave(0, testData.expenseClasses.second);
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.second.name,
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '$100.00',
          currentEncumbrance: '$100.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($100.00)' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClasses.second.name },
          { key: 'Initial encumbrance', value: '$100.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
