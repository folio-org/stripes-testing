import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import Receiving from '../../support/fragments/receiving/receiving';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../support/fragments/orders/orderLines';
import { TransactionDetails } from '../../support/fragments/finance';
import Users from '../../support/fragments/users/users';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    oneTimeOrder: {},
    oneTimeOrderLine: {},
    ongoingOrder: {},
    ongoingOrderLine: {},
    user: {},
    location: {},
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
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

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid.v4(),
      purchaseOrderId,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 2,
        poLineEstimatedPrice: 100.0,
      },
      fundDistribution: [
        {
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      locations: [
        {
          locationId,
          quantity: 2,
          quantityPhysical: 2,
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
      testData.oneTimeOrder = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.oneTimeOrderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.oneTimeOrderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createOngoingOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
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
      testData.ongoingOrder = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.ongoingOrderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.ongoingOrderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const receivePiece = (orderLineId) => {
    return cy.wait(3000).then(() => {
      return Receiving.getPiecesViaApi(orderLineId).then((pieces) => {
        return Receiving.receivePieceViaApi({
          poLineId: orderLineId,
          pieces: [
            {
              id: pieces[0].id,
            },
          ],
        });
      });
    });
  };

  const cancelOrder = (order) => {
    return Orders.updateOrderViaApi({
      ...order,
      workflowStatus: ORDER_STATUSES.CLOSED,
      closeReason: { reason: 'Cancelled', note: '' },
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

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then((fundData) => {
          testData.fund = fundData.fund;
          testData.budget = fundData.budget;
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
                    ).then(() => {
                      return receivePiece(testData.oneTimeOrderLine.id).then(() => {
                        return cancelOrder(testData.oneTimeOrder).then(() => {
                          return createOngoingOrderWithLine(
                            locationResponse.id,
                            materialType.id,
                            acquisitionMethod.body.acquisitionMethods[0].id,
                          ).then(() => {
                            return receivePiece(testData.ongoingOrderLine.id).then(() => {
                              return cancelOrder(testData.ongoingOrder);
                            });
                          });
                        });
                      });
                    });
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
          permissions.uiOrdersReopenPurchaseOrders.gui,
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
      Orders.deleteOrderViaApi(testData.oneTimeOrder.id);
      Orders.deleteOrderViaApi(testData.ongoingOrder.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C356784 Unrelease encumbrances when reopen one-time and ongoing received orders with no related invoices (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C356784'] },
    () => {
      Orders.searchByParameter('PO number', testData.oneTimeOrder.poNumber);
      Orders.selectFromResultsList(testData.oneTimeOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.reOpenOrder({ orderNumber: testData.oneTimeOrder.poNumber });
      OrderDetails.openPolDetails(testData.oneTimeOrderLine.titleOrPackage);
      OrderLines.checkPaymentStatusInPOL('Awaiting Payment');
      OrderLines.checkPOLReceiptStatus('Partially Received');
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: '$200.00',
          initialEncumbrance: '$200.00',
          currentEncumbrance: '$200.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($200.00)' },
          { key: 'Source', value: `${testData.oneTimeOrder.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$200.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.ongoingOrder.poNumber);
      Orders.selectFromResultsList(testData.ongoingOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.reOpenOrder({ orderNumber: testData.ongoingOrder.poNumber });
      OrderDetails.openPolDetails(testData.ongoingOrderLine.titleOrPackage);
      OrderLines.checkPaymentStatusInPOL('Ongoing');
      OrderLines.checkPOLReceiptStatus('Ongoing');
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: '$200.00',
          initialEncumbrance: '$200.00',
          currentEncumbrance: '$200.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($200.00)' },
          { key: 'Source', value: `${testData.ongoingOrder.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$200.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
