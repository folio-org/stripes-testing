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
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Invoices from '../../support/fragments/invoices/invoices';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../support/fragments/orders/orderLines';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
      fundC: {},
      fundD: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
      fundC: {},
      fundD: {},
    },
    expenseClass: {},
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
    location: {},
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
        allocated: 10000,
      };

      if (withExpenseClass) {
        budget.statusExpenseClasses = [{ expenseClassId: testData.expenseClass.id }];
      }

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 1005.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 1005.0,
      },
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
          expenseClassId: testData.expenseClass.id,
          distributionType: 'amount',
          value: 100,
        },
        {
          code: testData.funds.fundB.code,
          fundId: testData.funds.fundB.id,
          distributionType: 'percentage',
          value: 20,
        },
        {
          code: testData.funds.fundC.code,
          fundId: testData.funds.fundC.id,
          distributionType: 'amount',
          value: 704,
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
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
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
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createInvoiceForOrder = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        poLineId: testData.orderLine.id,
        fiscalYearId: testData.fiscalYear.id,
        batchGroupId: batchGroup.id,
        fundDistributions: testData.orderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 1005.0,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoiceResponse,
          status: INVOICE_STATUSES.APPROVED,
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
            (fundAData) => {
              testData.funds.fundA = fundAData.fund;
              testData.budgets.fundA = fundAData.budget;

              return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id, false).then(
                (fundBData) => {
                  testData.funds.fundB = fundBData.fund;
                  testData.budgets.fundB = fundBData.budget;

                  return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id, false).then(
                    (fundCData) => {
                      testData.funds.fundC = fundCData.fund;
                      testData.budgets.fundC = fundCData.budget;

                      return createFundWithBudget(
                        ledgerResponse.id,
                        fiscalYearResponse.id,
                        false,
                      ).then((fundDData) => {
                        testData.funds.fundD = fundDData.fund;
                        testData.budgets.fundD = fundDData.budget;
                      });
                    },
                  );
                },
              );
            },
          );
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
                  ).then(() => {
                    return createInvoiceForOrder();
                  });
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
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C357568 Encumbrance transaction does not update when fund name is changing in Open one-time order and Approved invoice related to POL exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C357568'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.deleteFundInPOLwithoutSave(0);
      OrderLines.deleteFundInPOLwithoutSave(0);
      OrderLines.deleteFundInPOLwithoutSave(0);
      OrderLines.addFundToPOLWithoutSave(0, testData.funds.fundD, '1005', true);
      OrderLines.saveOrderLine();
      OrderLines.checkErrorToastMessage(
        'The purchase order line fund distribution can not be changed because the order line is linked to an invoice line that currently has the "approved" status',
      );
    },
  );
});
