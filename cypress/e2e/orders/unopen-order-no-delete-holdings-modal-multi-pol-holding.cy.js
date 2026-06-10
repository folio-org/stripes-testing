import {
  ORDER_CALLOUT_MESSAGES,
  ORDER_FORMAT_VALUES,
  ORDER_SEARCH_INDEXES,
  ORDER_STATUSES,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { InventoryHoldings, InventoryInstance } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';

const R = {
  ORGANIZATION: 'organization',
  SERVICE_POINT: 'servicePoint',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  INSTANCE: 'instance',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  ORDER_LINE_1: 'orderLine1',
  ORDER_LINE_2: 'orderLine2',
  USER: 'user',
};

describe('Orders', () => {
  const flow = new ExecutionFlowManager();

  before('Create C839101 preconditions', () => {
    cy.getAdminToken();

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganization)
      .step(steps.createServicePointAndLocation)
      .step(steps.fetchMaterialType)
      .step(steps.fetchAcquisitionMethod)
      .step(steps.createInventoryInstance)
      .step(steps.createOrder1)
      .step(steps.createOrder2)
      .step(steps.createAndLoginUser);
  });

  after('Delete C839101 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C839101 "Delete Holdings" modal does not appear when un-opening an order if the holding is linked to multiple POLs without any pieces (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C839101'] },
    () => {
      const { location, order1, order2, orderLine1, orderLine2 } = flow.ctx();
      const order1Number = order1.poNumber;

      cy.log('<--- STEP 1 --->');
      Orders.selectFromResultsList(order1Number);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: ORDER_VIEW_FIELD_LABELS.PO_NUMBER, value: order1Number }],
      });

      cy.log('<--- STEP 2 --->');
      OrderDetails.unOpenOrder({
        hasRelations: false,
        orderNumber: order1Number,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(ORDER_CALLOUT_MESSAGES.ORDER_UNOPENED(order1Number));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.log('<--- STEP 3 --->');
      OrderDetails.openPolDetails(orderLine1.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: location.name },
            {
              key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL,
              value: orderLine1.locations[0].quantityPhysical,
            },
          ],
        ],
      });

      cy.log('<--- STEP 4 --->');
      Orders.selectOrderByPONumber(order2.poNumber);
      OrderDetails.waitLoading();

      cy.log('<--- STEP 5 --->');
      OrderDetails.openPolDetails(orderLine2.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: location.name },
            {
              key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL,
              value: orderLine2.locations[0].quantityPhysical,
            },
          ],
        ],
      });

      cy.log('<--- STEP 6 --->');
      OrderLineDetails.openInventoryItem();
      InventoryInstance.verifyInstanceTitle(orderLine2.titleOrPackage);
      InventoryInstance.checkHoldingTitle({
        title: location.name,
        count: 0,
      });
      InventoryInstance.checkAcquisitionsDetails([
        {
          polNumber: orderLine2.poLineNumber,
          orderStatus: order2.workflowStatus,
        },
        {
          polNumber: orderLine1.poLineNumber,
          orderStatus: ORDER_STATUSES.PENDING,
        },
      ]);
    },
  );
});

function getPreconditionSteps() {
  const createOrderAndLine = ({ flow, holdingId, locationId, orderKey, orderLineKey }) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({
        orderType: ORDER_TYPES.ONE_TIME_API,
        vendorId: flow.get(R.ORGANIZATION).id,
      }),
    )
      .then((order) => flow.set(orderKey, order, () => Orders.deleteOrderViaApi(order.id, false)))
      .then(() => {
        const cleanup = (orderLineId) => {
          OrderLines.deleteOrderLineViaApi(orderLineId, false);
        };

        const QUANTITY = 1;

        const baseLine = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
          checkinItems: true, // Independent receiving workflow
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          instanceId: flow.get(R.INSTANCE).instanceId,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          purchaseOrderId: flow.get(orderKey).id,
          quantity: QUANTITY,
          specialLocationId: flow.get(R.LOCATION).id,
          specialMaterialTypeId: flow.get(R.MATERIAL_TYPE).id,
          title: flow.get(R.INSTANCE).instanceTitle,
          vendorAccount: flow.get(R.ORGANIZATION).accounts[0].accountNo,
        });

        return OrderLines.createOrderLineViaApi({
          ...baseLine,
          locations: [
            {
              ...(locationId ? { locationId } : {}),
              ...(holdingId ? { holdingId } : {}),
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
          ],
        }).then((orderLine) => flow.set(orderLineKey, orderLine, cleanup.bind(null, orderLine.id)));
      })
      .then(() => {
        // Open order and update context
        return Orders.updateOrderViaApi({
          ...flow.get(orderKey),
          workflowStatus: ORDER_STATUSES.OPEN,
        })
          .then(() => Orders.getOrderByIdViaApi(flow.get(orderKey).id))
          .then((updatedOrder) => flow.set(orderKey, updatedOrder));
      })
      .then(() => {
        // Get actual PO Line after order opening
        return OrderLines.getOrderLineByIdViaApi(flow.get(orderLineKey).id).then((orderLine) => flow.set(orderLineKey, orderLine));
      });
  };

  const createOrganization = (flow) => {
    const organization = NewOrganization.getDefaultOrganization({ accounts: 1 });

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId));
    });
  };

  const createServicePointAndLocation = (flow) => {
    const servicePoint = ServicePoints.getDefaultServicePoint();

    return ServicePoints.createViaApi(servicePoint)
      .then(() => flow.set(R.SERVICE_POINT, servicePoint, () => ServicePoints.deleteViaApi(servicePoint.id)))
      .then(() => {
        const { location, campus, institution, library } = Locations.getDefaultLocation({
          servicePointId: servicePoint.id,
        });

        const cleanup = () => {
          Locations.deleteViaApi({
            id: location.id,
            libraryId: library.id,
            campusId: campus.id,
            institutionId: institution.id,
          });
        };

        Locations.createViaApi(location).then(() => flow.set(R.LOCATION, location, cleanup));
      });
  };

  const fetchMaterialType = (flow) => {
    return MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => flow.set(R.MATERIAL_TYPE, mtypes[0]));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi()
      .then(({ body }) => flow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
  };

  const createInventoryInstance = (flow) => {
    const cleanup = (instanceId) => {
      InventoryHoldings.deleteHoldingRecordByInstanceIdViaApi(instanceId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    };

    return InventoryInstance.createInstanceViaApi().then(({ instanceData }) => flow.set(R.INSTANCE, instanceData, cleanup.bind(null, instanceData.instanceId)));
  };

  const createOrder1 = (flow) => {
    return createOrderAndLine({
      flow,
      locationId: flow.get(R.LOCATION).id,
      orderKey: R.ORDER_1,
      orderLineKey: R.ORDER_LINE_1,
    });
  };

  const createOrder2 = (flow) => {
    return createOrderAndLine({
      flow,
      holdingId: flow.get(R.ORDER_LINE_1).locations[0].holdingId,
      orderKey: R.ORDER_2,
      orderLineKey: R.ORDER_LINE_2,
    });
  };

  const createAndLoginUser = (flow) => {
    cy.clearLocalStorage();

    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersUnopenpurchaseorders.gui,
      ])
      .then((user) => {
        flow.set(R.USER, user, () => Users.deleteViaApi(user.userId));

        cy.login(user.username, user.password, {
          path: {
            url: TopMenu.ordersPath,
            qs: {
              qindex: ORDER_SEARCH_INDEXES.PO_NUMBER,
              query: flow.get(R.ORDER_1).poNumber,
            },
          },
          waiter: Orders.waitLoading,
        });
      });
  };

  return {
    createAndLoginUser,
    fetchMaterialType,
    createOrder1,
    createOrder2,
    createOrganization,
    createServicePointAndLocation,
    createInventoryInstance,
    fetchAcquisitionMethod,
  };
}
