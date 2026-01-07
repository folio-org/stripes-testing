import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import Invoices from '../../support/fragments/invoices/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../support/utils';
import { TransactionDetails, FinanceHelper } from '../../support/fragments/finance';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
  APPLICATION_NAMES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { OrderDetails } from '../../support/fragments/orders';
import topMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

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
    expenseClass: {},
    organization: {},
    location: {},
    orders: {
      oneTimeReencumber: {},
      oneTimeNoReencumber: {},
      ongoingReencumber: {},
      ongoingNoReencumber: {},
    },
    orderLines: {
      oneTimeReencumber: {},
      oneTimeNoReencumber: {},
      ongoingReencumber: {},
      ongoingNoReencumber: {},
    },
    invoice: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first).then(() => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then(() => {
        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: testData.fiscalYears.first.id,
          restrictEncumbrance: false,
          restrictExpenditures: true,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const expenseClass = ExpenseClasses.getDefaultExpenseClass();

          return ExpenseClasses.createExpenseClassViaApi(expenseClass).then(
            (expenseClassResponse) => {
              testData.expenseClass = expenseClassResponse;

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
                  allocated: 200,
                };

                return Budgets.createViaApi(budget).then((budgetResponse) => {
                  testData.budget = budgetResponse;

                  return Budgets.updateBudgetViaApi({
                    ...budgetResponse,
                    statusExpenseClasses: [
                      {
                        status: 'Active',
                        expenseClassId: testData.expenseClass.id,
                      },
                    ],
                  });
                });
              });
            },
          );
        });
      });
    });
  };

  const createOrder = (orderType, reEncumber) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType,
      reEncumber,
    };

    if (orderType === 'Ongoing') {
      order.ongoing = {
        isSubscription: false,
        manualRenewal: false,
      };
    }

    return Orders.createOrderViaApi(order);
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      acquisitionMethod: acquisitionMethodId,
      cost: {
        listUnitPrice: 50.0,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 50.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
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
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithLine = (
    orderType,
    reEncumber,
    locationId,
    materialTypeId,
    acquisitionMethodId,
  ) => {
    return createOrder(orderType, reEncumber).then((orderResponse) => {
      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return { order: orderResponse, orderLine: orderLineResponse };
        });
      });
    });
  };

  const createAllOrders = (locationId, materialTypeId, acquisitionMethodId) => {
    return createOrderWithLine('One-Time', true, locationId, materialTypeId, acquisitionMethodId)
      .then((result) => {
        testData.orders.oneTimeReencumber = result.order;
        testData.orderLines.oneTimeReencumber = result.orderLine;
        return createOrderWithLine(
          'One-Time',
          false,
          locationId,
          materialTypeId,
          acquisitionMethodId,
        );
      })
      .then((result) => {
        testData.orders.oneTimeNoReencumber = result.order;
        testData.orderLines.oneTimeNoReencumber = result.orderLine;
        return createOrderWithLine(
          'Ongoing',
          true,
          locationId,
          materialTypeId,
          acquisitionMethodId,
        );
      })
      .then((result) => {
        testData.orders.ongoingReencumber = result.order;
        testData.orderLines.ongoingReencumber = result.orderLine;
        return createOrderWithLine(
          'Ongoing',
          false,
          locationId,
          materialTypeId,
          acquisitionMethodId,
        );
      })
      .then((result) => {
        testData.orders.ongoingNoReencumber = result.order;
        testData.orderLines.ongoingNoReencumber = result.orderLine;
      });
  };

  const createInvoiceWithAllLines = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYears.first.id,
        batchGroupId: batchGroup.id,
      }).then((invoice) => {
        testData.invoice = invoice;

        const createInvoiceLine = (poLineId, fundDistribution) => {
          const invoiceLine = Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: 'Open',
            poLineId,
            fundDistributions: fundDistribution,
            subTotal: 50.0,
            accountingCode: testData.organization.erpCode,
            releaseEncumbrance: true,
          });

          return Invoices.createInvoiceLineViaApi(invoiceLine);
        };

        return createInvoiceLine(
          testData.orderLines.oneTimeReencumber.id,
          testData.orderLines.oneTimeReencumber.fundDistribution,
        )
          .then(() => createInvoiceLine(
            testData.orderLines.oneTimeNoReencumber.id,
            testData.orderLines.oneTimeNoReencumber.fundDistribution,
          ))
          .then(() => createInvoiceLine(
            testData.orderLines.ongoingReencumber.id,
            testData.orderLines.ongoingReencumber.fundDistribution,
          ))
          .then(() => createInvoiceLine(
            testData.orderLines.ongoingNoReencumber.id,
            testData.orderLines.ongoingNoReencumber.fundDistribution,
          ))
          .then(() => {
            return Invoices.changeInvoiceStatusViaApi({
              invoice,
              status: INVOICE_STATUSES.APPROVED,
            }).then(() => {
              return Invoices.changeInvoiceStatusViaApi({
                invoice,
                status: INVOICE_STATUSES.PAID,
                searchParams: { poLinePaymentStatus: 'Fully Paid' },
              });
            });
          });
      });
    });
  };

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      needCloseBudgets: false,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      restrictEncumbrance: true,
      restrictExpenditures: true,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          addAvailableTo: 'Allocation',
          rolloverBudgetValue: 'None',
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

  const updateFiscalYearDates = () => {
    return FiscalYears.updateFiscalYearViaApi({
      ...testData.fiscalYears.first,
      _version: 1,
      ...DateTools.getFullFiscalYearStartAndEnd(-1),
    }).then(() => {
      return FiscalYears.updateFiscalYearViaApi({
        ...testData.fiscalYears.second,
        _version: 1,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      });
    });
  };

  const createLocationAndMaterialData = () => {
    return ServicePoints.getViaApi().then((servicePoint) => {
      return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
        (location) => {
          testData.location = location;

          return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
            return cy
              .getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
              })
              .then((acquisitionMethod) => {
                return {
                  locationId: testData.location.id,
                  materialTypeId: materialType.id,
                  acquisitionMethodId: acquisitionMethod.body.acquisitionMethods[0].id,
                };
              });
          });
        },
      );
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    return createFinanceData().then(() => {
      return Organizations.createOrganizationViaApi({
        ...NewOrganization.defaultUiOrganizations,
        isVendor: true,
      }).then((organizationId) => {
        testData.organization = {
          id: organizationId,
          erpCode: NewOrganization.defaultUiOrganizations.erpCode,
        };

        return createLocationAndMaterialData().then(
          ({ locationId, materialTypeId, acquisitionMethodId }) => {
            return createAllOrders(locationId, materialTypeId, acquisitionMethodId)
              .then(() => performRollover())
              .then(() => updateFiscalYearDates())
              .then(() => createInvoiceWithAllLines())
              .then(() => {
                cy.createTempUser([
                  permissions.uiFinanceViewFundAndBudget.gui,
                  permissions.uiOrdersView.gui,
                ]).then((userProperties) => {
                  testData.user = userProperties;

                  cy.login(testData.user.username, testData.user.password, {
                    path: TopMenu.ordersPath,
                    waiter: Orders.waitLoading,
                  });
                });
              });
          },
        );
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
    'C566509 Order line status updated when paying against previous Fiscal Year (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C566509'] },
    () => {
      Orders.searchByParameter('PO number', testData.orders.oneTimeReencumber.poNumber);
      Orders.selectFromResultsList(testData.orders.oneTimeReencumber.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLines.oneTimeReencumber.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);

      Orders.searchByParameter('PO number', testData.orders.oneTimeNoReencumber.poNumber);
      Orders.selectFromResultsList(testData.orders.oneTimeNoReencumber.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLines.oneTimeNoReencumber.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);

      Orders.searchByParameter('PO number', testData.orders.ongoingReencumber.poNumber);
      Orders.selectFromResultsList(testData.orders.ongoingReencumber.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLines.ongoingReencumber.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Payment status', conditions: { value: 'Ongoing' } },
      ]);

      Orders.searchByParameter('PO number', testData.orders.ongoingNoReencumber.poNumber);
      Orders.selectFromResultsList(testData.orders.ongoingNoReencumber.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLines.ongoingNoReencumber.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Payment status', conditions: { value: 'Ongoing' } },
      ]);

      topMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInListByIndex('Encumbrance', 3);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '$50.00' },
          { key: 'Source', value: testData.orderLines.oneTimeReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 2);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.oneTimeNoReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 1);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '$50.00' },
          { key: 'Source', value: testData.orderLines.ongoingReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 0);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.ongoingNoReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      Funds.closeTransactionApp(testData.fund, testData.fiscalYears.second);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInListByIndex('Encumbrance', 3);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.oneTimeReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$50.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 2);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.oneTimeNoReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$50.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 1);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.ongoingReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$50.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      Funds.selectTransactionInListByIndex('Encumbrance', 0);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLines.ongoingNoReencumber.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$50.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$50.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
