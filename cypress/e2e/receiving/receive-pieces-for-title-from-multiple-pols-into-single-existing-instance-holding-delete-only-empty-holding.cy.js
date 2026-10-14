import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const SECOND_ORDER_PIECES_ROW_INDEXES = [0, 1, 2];

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    instanceTitle: `AT_C934319_Instance_${getRandomPostfix()}`,
    servicePoint: {},
    location1: {},
    location2: {},
    location3: {},
    location4: {},
    materialType: {},
    acquisitionMethod: {},
    instanceType: {},
    holdingType: {},
    instance: {},
    instanceHoldings: [],
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const createLocation = (locationKey) => {
    const { location } = Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id });

    return Locations.createViaApi(location).then(() => {
      testData[locationKey] = location;
    });
  };

  const createLocations = () => {
    return ServicePoints.getCircDesk1ServicePointViaApi()
      .then((servicePoint) => {
        testData.servicePoint = servicePoint;

        return createLocation('location1');
      })
      .then(() => createLocation('location2'))
      .then(() => createLocation('location3'))
      .then(() => createLocation('location4'));
  };

  const fetchReferenceData = () => {
    return cy
      .getBookMaterialType()
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }))
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      })
      .then(() => cy.getInstanceTypes({ limit: 1 }))
      .then(([instanceType]) => {
        testData.instanceType = instanceType;
      })
      .then(() => cy.getHoldingTypes({ limit: 1 }))
      .then(([holdingType]) => {
        testData.holdingType = holdingType;
      });
  };

  // Instance has the Loc 1 holding without items
  const createInstance = () => {
    return InventoryInstances.createFolioInstanceViaApi({
      instance: { instanceTypeId: testData.instanceType.id, title: testData.instanceTitle },
      holdings: [
        { holdingsTypeId: testData.holdingType.id, permanentLocationId: testData.location1.id },
      ],
    }).then((instance) => {
      testData.instance = instance;
    });
  };

  // POL locations are specified as new holdings (locationId) or existing holdings (holdingId)
  const createOpenedOrder = ({ orderKey, orderLineKey, locations }) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData[orderKey] = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: locations.length,
            title: testData.instanceTitle,
            instanceId: testData.instance.instanceId,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location2.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          locations: locations.map((location) => ({
            ...location,
            quantity: 1,
            quantityPhysical: 1,
          })),
        });
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id))
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
  };

  // PO line of Order #1 has one piece in each of the new Loc 2 and Loc 3 holdings
  const createFirstOrder = () => {
    return createOpenedOrder({
      orderKey: 'firstOrder',
      orderLineKey: 'firstOrderLine',
      locations: [testData.location2, testData.location3].map(({ id }) => ({ locationId: id })),
    });
  };

  const fetchInstanceHoldings = () => {
    return cy
      .getHoldings({ limit: 10, query: `instanceId=="${testData.instance.instanceId}"` })
      .then((holdings) => {
        testData.instanceHoldings = holdings;
      });
  };

  // PO line of Order #2 has one piece in each of the existing Loc 2 and Loc 3 holdings and in the new Loc 4 holding
  const createSecondOrder = () => {
    const existingHoldings = [testData.location2, testData.location3].map((location) => {
      const { id } = testData.instanceHoldings.find(
        ({ permanentLocationId }) => permanentLocationId === location.id,
      );

      return { holdingId: id };
    });

    return createOpenedOrder({
      orderKey: 'secondOrder',
      orderLineKey: 'secondOrderLine',
      locations: [...existingHoldings, { locationId: testData.location4.id }],
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createLocations)
      .then(fetchReferenceData)
      .then(createInstance)
      .then(createFirstOrder)
      .then(fetchInstanceHoldings)
      .then(createSecondOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.firstOrder, testData.secondOrder].forEach(({ id }) => {
      Orders.getOrderByIdViaApi(id).then((order) => {
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
      });
      Orders.deleteOrderViaApi(id);
    });
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
    [testData.location1, testData.location2, testData.location3, testData.location4].forEach(
      (location) => {
        Locations.deleteViaApi(location);
      },
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C934319 Receive pieces for the Title from multiple POLs into a single existing instance holding (delete only empty holding) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C934319'] },
    () => {
      const { location1, location2, location3, location4 } = testData;

      // Step 1: Open the title related to PO line from Order #2
      Receiving.searchByParameter({ value: testData.instanceTitle });
      Receiving.selectFromResultsListByPolNumber(testData.secondOrderLine.poLineNumber);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(3);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.secondOrderLine.poLineNumber,
        titleName: testData.instanceTitle,
        rowCount: 3,
      });

      // Step 3: Receive all pieces into the existing Loc 1 holding of the instance
      SECOND_ORDER_PIECES_ROW_INDEXES.forEach((rowIndex) => {
        ReceivingsListEditForm.fillReceivingFields({ rowIndex });
        ReceivingsListEditForm.selectHolding({ holdingName: location1.name, rowIndex });
      });
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 4: Only the Loc 4 holding becomes empty and is deleted, Loc 2 and Loc 3 holdings have pieces of Order #1
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        locations: [location4],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(3);

      // Step 5: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location1.name, 3);
      InventoryInstance.checkHoldingsTableContent({
        name: location1.name,
        records: [
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
        ],
      });
      [location2, location3].forEach((location) => {
        InventoryInstance.verifyNumberOfItemsInHoldingByName(location.name, 1);
        InventoryInstance.checkHoldingsTableContent({
          name: location.name,
          records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
        });
      });
    },
  );
});
