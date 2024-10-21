import permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';
import { REQUEST_TYPES } from '../../support/constants';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { Locations } from '../../support/fragments/settings/tenant';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';

describe('Staff slips', () => {
  let userData;
  let userHoldData;
  const instanceData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.loginAsAdmin().then(() => {
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
        permissions.checkinAll.gui,
        permissions.checkoutAll.gui,
        permissions.inventoryAll.gui,
        permissions.uiRequestsAll.gui,
        permissions.uiCirculationCreateEditRemoveStaffSlips.gui,
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
          cy.visit(SettingsMenu.circulationStaffSlipsPath);
          EditStaffClips.editHold();
          EditStaffClips.addToken(['staffSlip.currentDateTime']);
          EditStaffClips.saveAndClose();
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
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
    { tags: ['extendedPath', 'volaris'] },
    () => {
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkOutItem(instanceData.folioInstances[0].barcodes[0]);

      cy.wait(10000);
      cy.visit(TopMenu.requestsPath);
      NewRequest.openNewRequestPane();
      NewRequest.enterItemInfo(instanceData.folioInstances[0].barcodes[0]);
      NewRequest.enterRequesterBarcode(userHoldData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(instanceData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      cy.wait('@createRequest').then((intercept) => {
        instanceData.requestId = intercept.response.body.id;
      });

      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(instanceData.folioInstances[0].barcodes[0]);
      ConfirmItemInModal.confirmAwaitingPickUpModal();
    },
  );
});
