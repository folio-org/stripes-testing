import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    instanceTitle: `AT_C934314_Instance_${randomPostfix}`,
    itemBarcode: `AT_C934314_item_${randomPostfix}`,
    servicePoint: {},
    location1: {},
    location2: {},
    location3: {},
    location4: {},
    materialType: {},
    acquisitionMethod: {},
    instanceType: {},
    holdingType: {},
    loanType: {},
    instance: {},
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
      })
      .then(() => cy.getLoanTypes({ limit: 1 }))
      .then(([loanType]) => {
        testData.loanType = loanType;
      });
  };

  // Instance has the Loc 1 holding with one item
  const createInstance = () => {
    return InventoryInstances.createFolioInstanceViaApi({
      instance: { instanceTypeId: testData.instanceType.id, title: testData.instanceTitle },
      holdings: [
        { holdingsTypeId: testData.holdingType.id, permanentLocationId: testData.location1.id },
      ],
      items: [
        {
          barcode: testData.itemBarcode,
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          permanentLoanType: { id: testData.loanType.id },
          materialType: { id: testData.materialType.id },
        },
      ],
    }).then((instance) => {
      testData.instance = instance;
    });
  };

  // PO line has one piece in the existing Loc 1 holding and one piece in the new Loc 2 holding
  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: 2,
            title: testData.instanceTitle,
            instanceId: testData.instance.instanceId,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          locations: [
            { holdingId: testData.instance.holdings[0].id, quantity: 1, quantityPhysical: 1 },
            { locationId: testData.location2.id, quantity: 1, quantityPhysical: 1 },
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
      .then(createInstance)
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
    'C934314 Receive pieces into new holdings when one of the existing holdings contains an item (existing holding is not deleted) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C934314'] },
    () => {
      const { location1, location2, location3, location4 } = testData;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.instanceTitle });
      Receiving.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: testData.instanceTitle,
        rowCount: 2,
      });

      // Steps 3-4: Receive the pieces from Loc 1 and Loc 2 into the new Loc 3 and Loc 4 holdings
      ReceivingsListEditForm.getRowIndexByHolding(location1.name).then((firstPieceRowIndex) => {
        ReceivingsListEditForm.getRowIndexByHolding(location2.name).then((secondPieceRowIndex) => {
          ReceivingsListEditForm.fillReceivingFields({ rowIndex: firstPieceRowIndex });
          ReceivingsListEditForm.fillReceivingFields({ rowIndex: secondPieceRowIndex });
          ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: firstPieceRowIndex });
          SelectLocationModal.selectLocation(location3.name);
          ReceivingsListEditForm.checkReceivingItemDetails({
            receivedLocation: location3.name,
            rowIndex: firstPieceRowIndex,
          });
          ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: secondPieceRowIndex });
          SelectLocationModal.selectLocation(location4.name);
          ReceivingsListEditForm.checkReceivingItemDetails({
            receivedLocation: location4.name,
            rowIndex: secondPieceRowIndex,
          });
        });
      });

      // Steps 5-6: Only the Loc 2 holding becomes empty and is deleted
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        locations: [location2],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 7: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location1.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location1.name,
        records: [{ barcode: testData.itemBarcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location3.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location3.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location4.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location4.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
    },
  );
});
