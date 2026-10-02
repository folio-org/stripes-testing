import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import { TransactionDetails } from '../../support/fragments/finance';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
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
    location: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const checkEncumbranceExpenseClass = (expenseClass) => {
    TransactionDetails.checkTransactionDetails({
      information: [
        { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
        { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($50.00)' },
        { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.order.poNumber}-1` },
        { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
        {
          key: TRANSACTION_DETAIL_FIELDS.FROM,
          value: `${testData.fund.name} (${testData.fund.code})`,
        },
        { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: expenseClass.name },
        { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$50.00' },
        { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
      ],
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    Object.keys(testData.expenseClasses).forEach((key) => {
      ExpenseClasses.createExpenseClassViaApi({
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C451477_ExpenseClass_${key}_${getRandomPostfix()}`,
      }).then((response) => {
        testData.expenseClasses[key] = response;
      });
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: fiscalYearResponse.id,
      }).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        }).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
            statusExpenseClasses: [
              { expenseClassId: testData.expenseClasses.first.id },
              { expenseClassId: testData.expenseClasses.second.id },
            ],
          }).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
    Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = { id: organizationResponse };
    });
    cy.getLocations({ limit: 1 }).then((location) => {
      testData.location = location;
    });
    cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
      }).then((acquisitionMethod) => {
        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          reEncumber: true,
        }).then((orderResponse) => {
          testData.order = orderResponse;

          OrderLines.createOrderLineViaApi({
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
                value: 50,
              },
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                expenseClassId: testData.expenseClasses.second.id,
                distributionType: 'percentage',
                value: 50,
              },
            ],
            locations: [
              {
                locationId: testData.location.id,
                quantity: 1,
                quantityPhysical: 1,
              },
            ],
            acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
          }).then((orderLineResponse) => {
            Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
            OrderLines.getOrderLineByIdViaApi(orderLineResponse.id).then((orderLine) => {
              testData.orderLine = orderLine;
            });
          });
        });
      });
    });
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
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Budgets.getBudgetViaApi({ query: `id=="${testData.budget.id}"` }).then((budgetResponse) => {
      Budgets.updateBudgetViaApi({
        ...budgetResponse.budgets[0],
        statusExpenseClasses: [],
      });
    });
    Object.values(testData.expenseClasses).forEach((expenseClass) => {
      ExpenseClasses.deleteExpenseClassViaApi(expenseClass.id);
    });
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
  });

  it(
    'C451477 Expense classes of transactions are updated correctly when Expense classes of Fund were switched in one POL (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C451477'] },
    () => {
      // Step 1: Click on PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          value: '50%',
          amount: '$50.00',
        },
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.second.name,
          value: '50%',
          amount: '$50.00',
        },
      ]);

      // Step 2: Click on "Actions" -> "Edit" button
      OrderLineDetails.openOrderLineEditForm();

      // Step 3: Switch "Expense class" values in "Fund distribution" accordion
      OrderLines.changeExpenseClassInPOLWithoutSave(0, testData.expenseClasses.second);
      OrderLines.changeExpenseClassInPOLWithoutSave(1, testData.expenseClasses.first);

      // Step 4: Click on "Save & close" button
      OrderLines.saveOrderLine();

      // Step 5: Check "Fund distribution" accordion
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.second.name,
          value: '50%',
          amount: '$50.00',
          currentEncumbrance: '$50.00',
        },
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          value: '50%',
          amount: '$50.00',
          currentEncumbrance: '$50.00',
        },
      ]);

      // Step 6: Click on the link in "Current encumbrance" column for the first record
      // Rows share the same fund, so the row is located by its unique expense class name
      OrderLineDetails.openEncumbrancePane(testData.expenseClasses.second.name);
      checkEncumbranceExpenseClass(testData.expenseClasses.second);

      // Step 7: Return to "Orders" app and click on the link in "Current encumbrance" column for the second record
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openEncumbrancePane(testData.expenseClasses.first.name);
      checkEncumbranceExpenseClass(testData.expenseClasses.first);
    },
  );
});
