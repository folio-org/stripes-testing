import uuid from 'uuid';
import moment from 'moment/moment';

import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { Locations } from '../../support/fragments/settings/tenant';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CheckInModal from '../../support/fragments/check-in-actions/checkInModal';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import UserEdit from '../../support/fragments/users/userEdit';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  let userData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const note1 = { title: 'Note 1', details: 'This is Note 1' };
  const note2 = { title: 'Note 2', details: 'This is Note 2' };
  const itemBarcode = testData.folioInstances[0].barcodes[0];

  before('Creating data', () => {
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userProperties.userId,
        testData.servicePoint.id,
      );
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: testData.folioInstances[0].barcodes[0],
        loanDate: moment.utc().format(),
        userBarcode: userData.barcode,
        servicePointId: testData.servicePoint.id,
      });
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
      }).then((res) => {
        const itemData = res;
        itemData.circulationNotes = [{ noteType: 'Check in', note: note1.title, staffOnly: true }];
        cy.updateItemViaApi(itemData);
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
      }).then((res) => {
        const itemData = res;
        itemData.circulationNotes = [
          ...itemData.circulationNotes,
          { noteType: 'Check in', note: note2.title, staffOnly: true },
        ];
        cy.updateItemViaApi(itemData);
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C776 Check in: check in notes (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Scan item with at least two check in notes in Check In app
      CheckInActions.checkInItemGui(itemBarcode);
      // Check in note modal appears
      CheckInModal.verifyModalTitle();
      CheckInModal.checkNotes([note2, note1]);
      // Click cancel on check in note modal
      CheckInModal.closeModal();
      // Scan item in Check In app
      CheckInActions.checkInItemGui(itemBarcode);
      // Check in note modal appears
      CheckInModal.verifyModalTitle();
      CheckInModal.checkNotes([note2, note1]);
      // Click confirm on check in note modal
      CheckInModal.confirmModal();
      // Item is checked in
      CheckInPane.checkResultsInTheRow([itemBarcode]);
      // Check in notes appears in menu
      CheckInActions.checkActionsMenuOptions(['checkInNotes']);
      // Click check in notes
      CheckInActions.openCheckInNotes([note2, note1]);
    },
  );
});
