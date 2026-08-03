import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

const R = {
  SERVICE_POINT: 'servicePoint',
  LOCATION_1: 'location1',
  LOCATION_2: 'location2',
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  INSTANCE: 'instance',
  ORGANIZATION: 'organization',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  ORDER_1: 'order1',
  ORDER_LINE_1: 'orderLine1',
  ORDER_2: 'order2',
  ORDER_LINE_2: 'orderLine2',
  USER: 'user',
};

const buildOrderLine = (flow, { purchaseOrderId, fundDistribution, locations, quantity }) => {
  // eslint-disable-next-line no-unused-vars
  const { id, ...orderLine } = {
    ...BasicOrderLine.defaultOrderLine,
    purchaseOrderId,
    cost: {
      listUnitPrice: 20,
      currency: 'USD',
      quantityPhysical: quantity,
      poLineEstimatedPrice: 20,
    },
    fundDistribution,
    locations,
    acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
    instanceId: flow.get(R.INSTANCE).instanceId,
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
      materialType: flow.get(R.MATERIAL_TYPE).id,
      materialSupplier: flow.get(R.ORGANIZATION).id,
    },
  };

  return orderLine;
};

const getPreconditionSteps = () => {
  const fetchServicePoint = (flow) => {
    return ServicePoints.getViaApi().then((servicePoints) => flow.set(R.SERVICE_POINT, servicePoints[0]));
  };

  const createLocation1 = (flow) => {
    return NewLocation.createViaApi(
      NewLocation.getDefaultLocation(flow.get(R.SERVICE_POINT).id),
    ).then((location) => flow.set(R.LOCATION_1, location, ({ institutionId, campusId, libraryId, id }) => NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      institutionId,
      campusId,
      libraryId,
      id,
    )));
  };

  const createLocation2 = (flow) => {
    return NewLocation.createViaApi(
      NewLocation.getDefaultLocation(flow.get(R.SERVICE_POINT).id),
    ).then((location) => flow.set(R.LOCATION_2, location, ({ institutionId, campusId, libraryId, id }) => NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      institutionId,
      campusId,
      libraryId,
      id,
    )));
  };

  const createFiscalYear = (flow) => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYear) => flow.set(R.FISCAL_YEAR, fiscalYear, ({ id }) => FiscalYears.deleteFiscalYearViaApi(id)));
  };

  const createLedger = (flow) => {
    return Ledgers.createViaApi({
      ...Ledgers.defaultUiLedger,
      fiscalYearOneId: flow.get(R.FISCAL_YEAR).id,
    }).then((ledger) => flow.set(R.LEDGER, ledger, ({ id }) => Ledgers.deleteLedgerViaApi(id)));
  };

  const createFundA = (flow) => {
    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: flow.get(R.LEDGER).id,
      restrictByLocations: false,
    }).then(({ fund }) => flow.set(R.FUND_A, fund, ({ id }) => Funds.deleteFundViaApi(id)));
  };

  const createBudgetA = (flow) => {
    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: flow.get(R.FISCAL_YEAR).id,
      fundId: flow.get(R.FUND_A).id,
      allocated: 100,
    }).then((budget) => flow.set(R.BUDGET_A, budget, ({ id }) => Budgets.deleteViaApi(id)));
  };

  const createFundB = (flow) => {
    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: flow.get(R.LEDGER).id,
      restrictByLocations: true,
      locations: [{ locationId: flow.get(R.LOCATION_1).id }],
    }).then(({ fund }) => flow.set(R.FUND_B, fund, ({ id }) => Funds.deleteFundViaApi(id)));
  };

  const createBudgetB = (flow) => {
    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: flow.get(R.FISCAL_YEAR).id,
      fundId: flow.get(R.FUND_B).id,
      allocated: 100,
    }).then((budget) => flow.set(R.BUDGET_B, budget, ({ id }) => Budgets.deleteViaApi(id)));
  };

  const createInstance = (flow) => {
    return InventoryInstance.createInstanceViaApi().then(({ instanceData }) => flow.set(R.INSTANCE, instanceData));
  };

  const createOrganization = (flow) => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationId) => flow.set(
      R.ORGANIZATION,
      { id: organizationId, erpCode: NewOrganization.defaultUiOrganizations.erpCode },
      () => Organizations.deleteOrganizationViaApi(organizationId),
    ));
  };

  const fetchMaterialType = (flow) => {
    return cy
      .getMaterialTypes({ limit: 1 })
      .then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
      })
      .then((response) => flow.set(R.ACQUISITION_METHOD, response.body.acquisitionMethods[0]));
  };

  const createOrder1WithLine = (flow) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: flow.get(R.ORGANIZATION).id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order)
      .then((orderResponse) => {
        flow.set(R.ORDER_1, orderResponse, (savedOrder) => Orders.updateOrderViaApi(
          { ...savedOrder, workflowStatus: ORDER_STATUSES.PENDING },
          true,
        ).then(() => Orders.deleteOrderViaApi(savedOrder.id)));

        return OrderLines.createOrderLineViaApi(
          buildOrderLine(flow, {
            purchaseOrderId: orderResponse.id,
            fundDistribution: [
              {
                code: flow.get(R.FUND_B).code,
                fundId: flow.get(R.FUND_B).id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
            locations: [
              { locationId: flow.get(R.LOCATION_1).id, quantity: 1, quantityPhysical: 1 },
            ],
            quantity: 1,
          }),
        );
      })
      .then((orderLineResponse) => {
        flow.set(R.ORDER_LINE_1, orderLineResponse);
        return Orders.updateOrderViaApi({
          ...flow.get(R.ORDER_1),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createOrder2WithLine = (flow) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: flow.get(R.ORGANIZATION).id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
      approved: true,
    };

    return Orders.createOrderViaApi(order)
      .then((orderResponse) => {
        flow.set(R.ORDER_2, orderResponse, (savedOrder) => Orders.updateOrderViaApi(
          { ...savedOrder, workflowStatus: ORDER_STATUSES.PENDING },
          true,
        ).then(() => Orders.deleteOrderViaApi(savedOrder.id)));

        return OrderLines.createOrderLineViaApi(
          buildOrderLine(flow, {
            purchaseOrderId: orderResponse.id,
            fundDistribution: [
              {
                code: flow.get(R.FUND_A).code,
                fundId: flow.get(R.FUND_A).id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 50,
              },
              {
                code: flow.get(R.FUND_B).code,
                fundId: flow.get(R.FUND_B).id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 50,
              },
            ],
            locations: [
              { locationId: flow.get(R.LOCATION_2).id, quantity: 2, quantityPhysical: 2 },
            ],
            quantity: 2,
          }),
        );
      })
      .then((orderLineResponse) => flow.set(R.ORDER_LINE_2, orderLineResponse));
  };

  const createUser = (flow) => {
    return cy
      .createTempUser([Permissions.uiOrdersApprovePurchaseOrders.gui, Permissions.uiOrdersEdit.gui])
      .then((userProperties) => flow.set(R.USER, userProperties, ({ userId }) => Users.deleteViaApi(userId)));
  };

  const loginAndNavigate = (flow) => {
    const { username, password } = flow.get(R.USER);
    return cy.login(username, password, {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
  };

  return {
    fetchServicePoint,
    createLocation1,
    createLocation2,
    createFiscalYear,
    createLedger,
    createFundA,
    createBudgetA,
    createFundB,
    createBudgetB,
    createInstance,
    createOrganization,
    fetchMaterialType,
    fetchAcquisitionMethod,
    createOrder1WithLine,
    createOrder2WithLine,
    createUser,
    loginAndNavigate,
  };
};

describe('Orders', () => {
  const flow = new ExecutionFlowManager();

  before('Create test data', () => {
    cy.getAdminToken();

    const steps = getPreconditionSteps();

    flow
      .step(steps.fetchServicePoint)
      .step(steps.createLocation1)
      .step(steps.createLocation2)
      .step(steps.createFiscalYear)
      .step(steps.createLedger)
      .step(steps.createFundA)
      .step(steps.createBudgetA)
      .step(steps.createFundB)
      .step(steps.createBudgetB)
      .step(steps.createInstance)
      .step(steps.createOrganization)
      .step(steps.fetchMaterialType)
      .step(steps.fetchAcquisitionMethod)
      .step(steps.createOrder1WithLine)
      .step(steps.createOrder2WithLine)
      .step(steps.createUser)
      .step(steps.loginAndNavigate);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C435907 An order with two funds (one is restricted by location) can be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C435907'] },
    () => {
      const { order2, orderLine2, location1 } = flow.ctx();

      cy.log('<----- STEP 1 ----->');
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order2.poNumber);
      Orders.selectFromResultsList(order2.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.log('<----- STEP 2 ----->');
      Orders.openOrder();
      Orders.checkInvalidLocationErrorMessage(orderLine2.poLineNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.log('<----- STEP 3 ----->');
      OrderDetails.openPolDetails(orderLine2.titleOrPackage);
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();

      cy.log('<----- STEP 4 ----->');
      OrderLineDetails.openOrderLineEditForm();

      cy.log('<----- STEP 5 ----->');
      OrderLines.setPhysicalQuantity({
        quantity: '1',
        index: 0,
      });
      OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.selectLocation(location1.name);
      OrderLines.setPhysicalQuantity({
        quantity: '1',
        index: 1,
        changeQuantity: false,
      });

      cy.log('<----- STEP 6 ----->');
      OrderLineEditForm.clickSaveButton();
      InteractorsTools.checkNoErrorCallouts();

      cy.log('<----- STEP 7 ----->');
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: order2.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      cy.log('<----- STEP 8 ----->');
      OrderDetails.openPolDetails(orderLine2.titleOrPackage);
      InteractorsTools.checkNoErrorCallouts();
    },
  );
});
