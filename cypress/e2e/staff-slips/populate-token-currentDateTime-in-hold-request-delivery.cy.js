import { APPLICATION_NAMES, REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Staff slips', () => {
  let userData;
  let userHoldData;
  const instanceData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(instanceData.servicePoint);
      instanceData.defaultLocation = Location.getDefaultLocation(instanceData.servicePoint.id);
      Location.createViaApi(instanceData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: instanceData.folioInstances,
          location,
        });
      });

      cy.createTempUser().then((userProperties) => {
        userHoldData = userProperties;
      });

      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.checkoutAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiRequestsAll.gui,
        Permissions.uiCirculationCreateEditRemoveStaffSlips.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;

          UserEdit.addServicePointViaApi(
            instanceData.servicePoint.id,
            userData.userId,
            instanceData.servicePoint.id,
          );
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationStaffSlipsPath,
            waiter: EditStaffClips.waitLoading,
          });
          EditStaffClips.editHold();
          EditStaffClips.addToken(['staffSlip.currentDateTime']);
          EditStaffClips.saveAndClose();
        });
    });
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.circulationStaffSlipsPath);
    EditStaffClips.editAndClearHold();
    Requests.deleteRequestViaApi(instanceData.requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [instanceData.servicePoint.id]);
    ServicePoints.deleteViaApi(instanceData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData.folioInstances[0],
      servicePoint: instanceData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(instanceData.defaultLocation);
  });

  it(
    'C388509 Populate the token "currentDateTime" in the hold, request delivery (volaris)',
    { tags: ['extendedPath', 'volaris', 'C388509'] },
    () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkOutItem(instanceData.folioInstances[0].barcodes[0]);

      cy.wait(10000);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      NewRequest.openNewRequestPane();
      NewRequest.enterItemInfo(instanceData.folioInstances[0].barcodes[0]);
      NewRequest.enterRequesterBarcode(userHoldData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(instanceData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        instanceData.requestId = intercept.response.body.id;
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.checkInItemGui(instanceData.folioInstances[0].barcodes[0]);
      ConfirmItemInModal.confirmAwaitingPickUpModal();
    },
  );
});
