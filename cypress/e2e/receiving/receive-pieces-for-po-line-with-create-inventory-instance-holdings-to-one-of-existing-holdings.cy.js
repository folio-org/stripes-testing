import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
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

const PIECES_ROW_INDEXES = [0, 1];

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
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
      .then(() => createLocation('location2'));
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
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: 2,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          }),
          locations: [testData.location1, testData.location2].map(({ id }) => ({
            locationId: id,
            quantity: 1,
            quantityPhysical: 1,
          })),
        });
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
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
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    [testData.location1, testData.location2].forEach((location) => {
      Locations.deleteViaApi(location);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1045969 Receive pieces for the PO line with create inventory "Instance, holdings" to one of the existing holding (Delete only empty holding) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1045969'] },
    () => {
      const { location1, location2 } = testData;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: testData.orderLine.titleOrPackage,
        rowCount: 2,
      });

      // Step 3: Check both pieces, receive the piece from Loc 1 into the existing Loc 2 holding
      ReceivingsListEditForm.getRowIndexByHolding(location1.name).then((rowIndex) => {
        PIECES_ROW_INDEXES.forEach((pieceRowIndex) => {
          ReceivingsListEditForm.fillReceivingFields({ rowIndex: pieceRowIndex });
        });
        ReceivingsListEditForm.selectHolding({ holdingName: location2.name, rowIndex });
      });
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 4: The Loc 1 holding becomes empty and is deleted
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        locations: [location1],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 5: Click on the title name link, the only Loc 2 holding has no items
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InstanceRecordView.verifyItemsListIsEmpty(location2.name);
    },
  );
});
