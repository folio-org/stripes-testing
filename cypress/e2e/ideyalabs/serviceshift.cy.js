import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/servicePoint/switchServicePoint';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';

describe.skip('Check In - Actions', () => {
  const userData = {};
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(
      'S',
      uuid()
    ),
    servicePointS1: ServicePoints.getDefaultServicePointWithPickUpLocation(
      'S1',
      uuid()
    ),
  };
  const itemData = {
    barcode: generateItemBarcode() + 10,
    title: `Instance_${getRandomPostfix()}`,
  };
  const itemData1 = {
    barcode: generateItemBarcode(),
    title: `Instance_${getRandomPostfix()}`,
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePointS);
        ServicePoints.createViaApi(testData.servicePointS1);
        testData.defaultLocation = Location.getDefaultLocation(
          testData.servicePointS.id
        );
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
          itemData.materialType =
            materialTypes.name[0].toUpperCase() + materialTypes.name.slice(1);
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: itemData1.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
          itemData.holdingId = specialInstanceIds.holdingIds[0].id;
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });

    cy.createTempUser([
      permissions.checkinAll.gui,
      permissions.uiRequestsView.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
    ])
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.servicePointS.id, testData.servicePointS1.id],
          userData.userId,
          testData.servicePointS.id
        );
        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.servicePointS.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePointS.id,
      testData.servicePointS1.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    ServicePoints.deleteViaApi(testData.servicePointS1.id);
    Users.deleteViaApi(userData.userId);
    cy.deleteItemViaApi(itemData.itemId[0]);
    cy.deleteItemViaApi(itemData.itemId[1]);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C7148 Check In: item with at least one open request (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      SwitchServicePoint.switchServicePoint(testData.servicePointS.name);
      SwitchServicePoint.checkIsServicePointSwitched(
        testData.servicePointS.name
      );
      CheckInActions.checkInItemGui(itemData.barcode);
      checkInActions.openItemDetails();
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcode);
      checkInActions.verifyCheckIn();

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      SwitchServicePoint.switchServicePoint(testData.servicePointS1.name);
      CheckInActions.checkInItemGui(itemData1.barcode);
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      checkInActions.openItemDetails();
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData1.barcode);
      checkInActions.verifyCheckIn();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
    }
  );
});
