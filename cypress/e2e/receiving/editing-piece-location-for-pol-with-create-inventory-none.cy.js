import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import DeleteHoldingsModal from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C503266_Organization_${postfix}`,
      },
      instanceTitle: `AT_C503266_FolioInstance_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(2).then(([polLocation, newLocation]) => {
      testData.polLocation = polLocation;
      testData.newLocation = newLocation;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
          // Receiving workflow: Independent order and receipt quantity
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.polLocation.id, quantity: 1, quantityPhysical: 1 }],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        }).then(() => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiReceivingDelete, CapabilitySets.uiInventoryInstanceView],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.instanceTitle });
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C503266 Editing piece holding related to POL with Create inventory - None option selected (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C503266'] },
    () => {
      const { polLocation, newLocation } = testData;

      // Step 1: Click "Actions" next to "Expected" accordion and select "Add piece"
      Receivings.addPieceInActions();
      PieceForm.waitLoading();

      // Step 2: Select the POL location, "Create item" is not displayed, click "Save & close"
      EditPieceModal.selectLocation(polLocation.name);
      EditPieceModal.verifySelectedLocation(polLocation.name, { isSelection: true });
      EditPieceModal.verifyCheckboxPresent(RECEIVING_PIECE_FORM_FIELD_LABELS.CREATE_ITEM, false);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 3: Click on the newly added piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Step 4: Select a location different from the POL one and click "Save & close"
      EditPieceModal.clickLocationLookUpButton();
      SelectLocationModal.selectLocation(newLocation.name);
      EditPieceModal.verifySelectedLocation(newLocation.name, { isSelection: true });
      EditPieceModal.clickSaveAndCloseButton();
      DeleteHoldingsModal.verifyModalAbsent();
      ReceivingDetails.verifyExpectedRecordsCount(1);
    },
  );
});
