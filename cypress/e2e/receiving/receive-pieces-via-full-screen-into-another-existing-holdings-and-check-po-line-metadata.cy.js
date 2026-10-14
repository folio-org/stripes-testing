import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();
const barcodes = {
  firstPiece: `AT_C934313_first_${randomPostfix}`,
  secondPiece: `AT_C934313_second_${randomPostfix}`,
};

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
    materialType: {},
    acquisitionMethod: {},
    adminUser: {},
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
      })
      .then(() => cy.getAdminUserDetails())
      .then((adminUser) => {
        testData.adminUser = adminUser;
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
            quantity: 2,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
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
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingView.gui,
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
    'C934313 Receive pieces via full screen into another existing holdings and check PO line metadata (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C934313'] },
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

      // Step 3: Receive the piece from Loc 1 into the Loc 2 holding and the piece from Loc 2 into the Loc 1 holding
      ReceivingsListEditForm.getRowIndexByHolding(location1.name).then((firstPieceRowIndex) => {
        ReceivingsListEditForm.getRowIndexByHolding(location2.name).then((secondPieceRowIndex) => {
          ReceivingsListEditForm.fillReceivingFields({
            rowIndex: firstPieceRowIndex,
            barcode: barcodes.firstPiece,
          });
          ReceivingsListEditForm.fillReceivingFields({
            rowIndex: secondPieceRowIndex,
            barcode: barcodes.secondPiece,
          });
          ReceivingsListEditForm.selectHolding({
            holdingName: location2.name,
            rowIndex: firstPieceRowIndex,
          });
          ReceivingsListEditForm.selectHolding({
            holdingName: location1.name,
            rowIndex: secondPieceRowIndex,
          });
        });
      });
      ReceivingsListEditForm.clickReceiveButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 4: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location2.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location2.name,
        records: [{ barcode: barcodes.firstPiece, status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location1.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location1.name,
        records: [{ barcode: barcodes.secondPiece, status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });

      // Step 5: Open the PO line, it is updated by the user who received the pieces
      InventoryInstance.openPolFromAcquisitionsAccordion();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
        ],
      });
      OrderLineDetails.toggleMetadataAccordion();
      OrderLineDetails.verifyMetadataContent({
        updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
      });
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then(({ metadata }) => {
        expect(metadata.createdByUserId).to.equal(testData.adminUser.id);
        expect(metadata.updatedByUserId).to.equal(testData.user.userId);
        expect(new Date(metadata.updatedDate)).to.be.greaterThan(new Date(metadata.createdDate));
      });
    },
  );
});
