import permissions from '../../support/dictionary/permissions';
import { ORDER_STATUSES, ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import { OrderLineDetails } from '../../support/fragments/orders';
import {
  BudgetDetails,
  FundDetails,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';

describe('Orders', () => {
  const code = CodeTools(4);
  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first).then(() => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then(() => {
        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: testData.fiscalYears.first.id,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResponse.id,
          };

          return Funds.createViaApi(fund).then((fundResponse) => {
            testData.fund = fundResponse.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: testData.fiscalYears.first.id,
              fundId: fundResponse.fund.id,
              allocated: 100,
            };

            return Budgets.createViaApi(budget).then((budgetResponse) => {
              testData.budget = budgetResponse;
            });
          });
        });
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 10.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 10.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
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
      },
    };
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'Ongoing',
      reEncumber: true,
      ongoing: {
        isSubscription: false,
        manualRenewal: false,
      },
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return Orders.updateOrderViaApi({
            ...orderResponse,
            workflowStatus: ORDER_STATUSES.PENDING,
          });
        });
      });
    });
  };

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      needCloseBudgets: true,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: 'None',
          addAvailableTo: 'Available',
        },
      ],
      encumbrancesRollover: [
        {
          orderType: 'Ongoing',
          basedOn: 'InitialAmount',
        },
        {
          orderType: 'Ongoing-Subscription',
          basedOn: 'InitialAmount',
        },
        {
          orderType: 'One-time',
          basedOn: 'InitialAmount',
        },
      ],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover);
  };

  const performRolloverAndUpdateFiscalYears = () => {
    return performRollover()
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.first,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        });
      })
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.second,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        });
      });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
      };

      return ServicePoints.getViaApi().then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
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
                  ).then(() => performRolloverAndUpdateFiscalYears());
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

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C655280 Ongoing order can be reopened after rollover (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C655280'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: '$10.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: '$10.00',
          initialEncumbrance: '$10.00',
          currentEncumbrance: '$10.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '($10.00)' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      Transactions.closeTransactionsPage();
      BudgetDetails.closeBudgetDetails();
      FundDetails.openPreviousBudgetDetails();
      BudgetDetails.clickViewTransactionsLink();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Status', value: 'Pending' },
        ],
      });
    },
  );
});
