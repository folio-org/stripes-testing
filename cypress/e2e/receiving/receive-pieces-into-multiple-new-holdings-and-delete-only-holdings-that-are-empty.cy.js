import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const PIECES_ROW_INDEXES = [0, 1, 2, 3];

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
    location3: {},
    location4: {},
    location5: {},
    location6: {},
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
      .then(() => createLocation('location2'))
      .then(() => createLocation('location3'))
      .then(() => createLocation('location4'))
      .then(() => createLocation('location5'))
      .then(() => createLocation('location6'));
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
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: 4,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          locations: [
            { locationId: testData.location1.id, quantity: 2, quantityPhysical: 2 },
            { locationId: testData.location2.id, quantity: 1, quantityPhysical: 1 },
            { locationId: testData.location3.id, quantity: 1, quantityPhysical: 1 },
          ],
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
    [
      testData.location1,
      testData.location2,
      testData.location3,
      testData.location4,
      testData.location5,
      testData.location6,
    ].forEach((location) => {
      Locations.deleteViaApi(location);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C934316 Receive pieces into multiple new holdings and delete only holdings that are empty (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C934316'] },
    () => {
      const { location1, location2, location3, location4, location5, location6 } = testData;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(4);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: testData.orderLine.titleOrPackage,
        rowCount: 4,
      });

      // Steps 3-5: Receive a piece from each of Loc 1, Loc 2 and Loc 3 into the new Loc 4, Loc 5 and Loc 6 holdings
      ReceivingsListEditForm.getRowIndexByHolding(location2.name).then((location2RowIndex) => {
        ReceivingsListEditForm.getRowIndexByHolding(location3.name).then((location3RowIndex) => {
          const [location1RowIndex] = PIECES_ROW_INDEXES.filter(
            (rowIndex) => ![location2RowIndex, location3RowIndex].includes(rowIndex),
          );

          PIECES_ROW_INDEXES.forEach((rowIndex) => {
            ReceivingsListEditForm.fillReceivingFields({ rowIndex });
          });
          [
            { rowIndex: location1RowIndex, location: location4 },
            { rowIndex: location2RowIndex, location: location5 },
            { rowIndex: location3RowIndex, location: location6 },
          ].forEach(({ rowIndex, location }) => {
            ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex });
            SelectLocationModal.selectLocation(location.name);
            ReceivingsListEditForm.checkReceivingItemDetails({
              receivedLocation: location.name,
              rowIndex,
            });
          });
        });
      });

      // Steps 6-7: Loc 2 and Loc 3 holdings become empty and are deleted, Loc 1 holding still has a piece
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        locations: [location2, location3],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(4);

      // Step 8: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(4);
      [location1, location4, location5, location6].forEach((location) => {
        InventoryInstance.verifyNumberOfItemsInHoldingByName(location.name, 1);
        InventoryInstance.checkHoldingsTableContent({
          name: location.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
      });
    },
  );
});
