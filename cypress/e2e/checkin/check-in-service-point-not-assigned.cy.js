import { ITEM_STATUS_NAMES } from '../../support/constants';
import { TestTypes, DevTeams, Parallelization, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';

describe('Check In - Actions', () => {
  let userData;
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePointS1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const checkInResultsData = {
    statusForS: [`In transit - ${testData.servicePointS1.name}`],
    statusForS1: ['Awaiting pickup'],
  };
  const itemData = {
    barcode: generateItemBarcode(),
    title: `Instance_${getRandomPostfix()}`,
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePointS);
        ServicePoints.createViaApi(testData.servicePointS1);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePointS1.id);
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
          itemData.materialType = materialTypes.name;
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
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
          itemData.holdingId = specialInstanceIds.holdingIds[0].id;
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser([Permissions.checkinAll.gui, permissions.loansView.gui], patronGroup.name)
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.servicePointS.id, testData.servicePointS1.id],
          userData.userId,
          testData.servicePointS.id,
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
    PatronGroups.deleteViaApi(patronGroup.id);
    ItemActions.deleteItemViaApi(itemData.itemId);
    InventoryHoldings.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    "C588 Check in: at service point not assigned to item's effective location (vega) (TaaS)",
    { tags: [TestTypes.criticalPath, DevTeams.vega, Parallelization.nonParallel] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();

      // Scan item in Check In app
      CheckInActions.checkInItemGui(itemData.barcode);
      InTransit.verifyModalTitle();
      InTransit.verifySelectedCheckboxPrintSlip();
      // Close modal and Close print window without printing.
      ConfirmItemInModal.confirmInTransitModal();
      // Check In app displays item information
      CheckInPane.checkResultsInTheRow([itemData.barcode]);
      CheckInPane.checkResultsInTheRow([`${itemData.title} (${itemData.materialType})`]);
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);
      // Open ellipsis menu for item that has been checked in.
      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'itemDetails']);

      // Scan item in Check In app
      CheckInActions.checkInItemGui(itemData.barcode);
      InTransit.verifyModalTitle();
      InTransit.verifySelectedCheckboxPrintSlip();
      // Uncheck "Print slip" checkbox. Close modal.
      InTransit.unselectCheckboxPrintSlip();
      // Close modal
      InTransit.closeModal();
      // Check In app displays item information
      CheckInPane.checkResultsInTheRow([itemData.barcode]);
      CheckInPane.checkResultsInTheRow([`${itemData.title} (${itemData.materialType})`]);
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);
      // Open ellipsis menu for item that has been checked in.
      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'itemDetails']);
    },
  );
});
