import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInModal from '../../support/fragments/check-in-actions/checkInModal';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import MultipieceCheckIn from '../../support/fragments/checkin/modals/multipieceCheckIn';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check in', () => {
  let userData;
  let servicePointS;
  let servicePointS1;
  let locationL;
  let materialType;
  let itemBarcode;
  const testData = {
    folioInstances: [],
  };
  const checkInNote = {
    title: `Check-in note ${getRandomPostfix()}`,
    details: 'This is a check-in note for testing',
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      cy.getAdminToken().then(() => {
        cy.getDefaultMaterialType()
          .then((mt) => {
            materialType = mt;

            servicePointS = ServicePoints.getDefaultServicePointWithPickUpLocation();
            servicePointS1 = ServicePoints.getDefaultServicePointWithPickUpLocation();

            ServicePoints.createViaApi(servicePointS);
            ServicePoints.createViaApi(servicePointS1);

            const itemProps = MultipieceCheckIn.getItemProps(3, true, true, materialType.name);

            testData.folioInstances = InventoryInstances.generateFolioInstances({
              itemsProperties: itemProps,
            });
            itemBarcode = testData.folioInstances[0].barcodes[0];

            locationL = Locations.getDefaultLocation({
              servicePointId: servicePointS1.id,
            }).location;

            Locations.createViaApi(locationL).then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location,
              });
            });
          })
          .then(() => {
            cy.getItems({
              limit: 1,
              expandAll: true,
              query: `"barcode"=="${itemBarcode}"`,
            }).then((res) => {
              const itemData = res;
              checkInNote.date = DateTools.getFormattedDateWithTime(new Date(), {
                withoutComma: true,
              });
              itemData.circulationNotes = [
                { noteType: 'Check in', note: checkInNote.title, staffOnly: true },
              ];
              itemData.status.name = ITEM_STATUS_NAMES.MISSING;
              cy.updateItemViaApi(itemData);
            });

            UserEdit.addServicePointViaApi(servicePointS.id, userData.userId, servicePointS.id);
          });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: servicePointS.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: servicePointS,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(locationL);
    ServicePoints.deleteViaApi(servicePointS.id);
    ServicePoints.deleteViaApi(servicePointS1.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C7149 Check in: items with multiple modals (ordering) (vega)',
    { tags: ['smoke', 'vega', 'C7149'] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });

      // Step 1-2: Scan item, verify missing modal appears, cancel, verify item not checked in
      CheckInActions.checkInItemGui(itemBarcode);
      ConfirmItemInModal.verifyMissingModalExists();
      ConfirmItemInModal.cancelMissingModal();
      CheckInPane.checkItemIsNotCheckedIn(itemBarcode);

      // Step 3-5: Scan item, confirm missing modal, verify multipiece modal, cancel, verify item not checked in
      CheckInActions.checkInItemGui(itemBarcode);
      ConfirmItemInModal.confirmMissingModal();
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.cancelModal();
      CheckInPane.checkItemIsNotCheckedIn(itemBarcode);

      // Step 6-9: Scan item, confirm missing, confirm multipiece, verify check-in notes, cancel, verify not checked in
      CheckInActions.checkInItemGui(itemBarcode);
      ConfirmItemInModal.confirmMissingModal();
      ConfirmItemInModal.confirmMultipieceCheckInModal();
      CheckInModal.verifyModalTitle();
      CheckInModal.closeModal();
      CheckInModal.verifyModalIsClosed();
      CheckInPane.checkItemIsNotCheckedIn(itemBarcode);

      // Step 10-14: Complete full sequence - scan, confirm all modals, verify in-transit, verify checked in
      CheckInActions.checkInItemGui(itemBarcode);
      ConfirmItemInModal.confirmMissingModal();
      ConfirmItemInModal.confirmMultipieceCheckInModal();
      CheckInModal.verifyModalTitle();
      CheckInModal.confirmModal();
      ConfirmItemInModal.confirmInTransitModal();
      CheckInPane.checkResultsInTheRow([itemBarcode]);
      CheckInPane.checkResultsInTheRow([`In transit - ${servicePointS1.name}`]);
    },
  );
});
