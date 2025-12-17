import permissions from '../../support/dictionary/permissions';
import orderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
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

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
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
        allocated: 100,
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
          listUnitPrice: 10.0,
          currency: 'EUR',
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

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return Orders.getOrderByIdViaApi(orderResponse.id).then((openedOrder) => {
            testData.order = openedOrder;
          });
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

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id);
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
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C558403 Verify encumbrance amount updates when exchange rate is edited on open order for both supported and unsupported currencies by ECB provider (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C558403'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: '€10.00',
          initialEncumbrance: `$${testData.order.totalEstimatedPrice.toFixed(2)}`,
          currentEncumbrance: `$${testData.order.totalEstimatedPrice.toFixed(2)}`,
        },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      orderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: false, disabled: false } },
        {
          label: 'calculatedTotalAmount',
          conditions: { value: `$${testData.order.totalEstimatedPrice.toFixed(2)}` },
        },
      ]);
      OrderLines.setExchangeRate('1.7');
      orderLineEditForm.checkCostDetailsSection([
        { label: 'calculatedTotalAmount', conditions: { value: '$17.00' } },
      ]);
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          foreignAmount: '€10.00',
          initialEncumbrance: '$17.00',
          currentEncumbrance: '$17.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($17.00)' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$17.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      TransactionDetails.openSourceInTransactionDetails();
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.selectCurrency('Ukrainian Hryvnia (UAH)');
      orderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: true } },
      ]);
      OrderLines.setExchangeRate('3.3');
      orderLineEditForm.checkCostDetailsSection([
        { label: 'calculatedTotalAmount', conditions: { value: '$33.00' } },
      ]);
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: 'UAH 10.00', // Non-breaking space is needed here
          initialEncumbrance: '$33.00',
          currentEncumbrance: '$33.00',
        },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.setExchangeRate('5.5');
      orderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: true } },
        { label: 'calculatedTotalAmount', conditions: { value: '$55.00' } },
      ]);
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: 'UAH 10.00', // Non-breaking space is needed here
          initialEncumbrance: '$55.00',
          currentEncumbrance: '$55.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($55.00)' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$55.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
