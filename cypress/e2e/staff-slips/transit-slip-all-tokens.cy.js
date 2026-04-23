import { STAFF_SLIP_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Staff slips', () => {
  const testData = {
    servicePointA: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePointB: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePointA);
      ServicePoints.createViaApi(testData.servicePointB);
      cy.getDefaultMaterialType().then((materialType) => {
        testData.materialType = materialType;
        testData.folioInstances = InventoryInstances.generateFolioInstances({
          itemsProperties: { materialType: { id: materialType.id } },
        });
        const locationData = Locations.getDefaultLocation({
          servicePointId: testData.servicePointA.id,
        });
        testData.location = locationData.location;
        Locations.createViaApi(testData.location).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      });
      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.uiCirculationCreateEditRemoveStaffSlips.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePointA.id, testData.servicePointB.id],
          testData.user.userId,
          testData.servicePointA.id,
        );
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.circulationStaffSlipsPath,
          waiter: EditStaffClips.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        servicePointId: testData.servicePointA.id,
        checkInDate: new Date().toISOString(),
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.servicePointA.id,
        testData.servicePointB.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePointA.id);
      ServicePoints.deleteViaApi(testData.servicePointB.id);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Locations.deleteViaApi(testData.location);
    });
  });

  it(
    'C543 Configure and test transit slip including all tokens (vega)',
    { tags: ['extendedPath', 'vega', 'C543'] },
    () => {
      // Step 1-2: Navigate to Staff slips > Transit > Edit
      EditStaffClips.editTransit();

      // Step 3-4: Add all available tokens
      EditStaffClips.clickCurlyBracketsButton();
      EditStaffClips.selectAllTokensInModal();
      EditStaffClips.clickAddTokenButton();
      EditStaffClips.verifyTokensAddedToTemplate();

      // Step 5: Save the transit slip
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate(STAFF_SLIP_NAMES.TRANSIT);

      // Step 8: Switch to service point not associated with item's effective location
      SwitchServicePoint.switchServicePoint(testData.servicePointB.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointB.name);

      // Step 9-10: Check in item - should trigger In transit modal
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(testData.folioInstances[0].barcodes[0]);
      InTransit.verifyModalTitle();

      // Step 11: Verify print slip checkbox exists and is functional
      // Note: Actual print preview content cannot be verified via Cypress
      InTransit.verifySelectedCheckboxPrintSlip();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
    },
  );
});
