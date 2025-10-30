import uuid from 'uuid';
import moment from 'moment/moment';
import { Permissions } from '../../support/dictionary';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CheckInModal from '../../support/fragments/check-in-actions/checkInModal';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import DateTools from '../../support/utils/dateTools';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  let userData;
  let servicePoint;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    requestsId: '',
  };
  const note1 = { title: 'Note 1', details: 'This is Note 1', source: 'ADMINISTRATOR, DIKU' };
  const note2 = { title: 'Note 2', details: 'This is Note 2', source: 'ADMINISTRATOR, DIKU' };
  const itemBarcode = testData.folioInstances[0].barcodes[0];

  before('Creating test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        servicePoint = sp;
      });
    });
    cy.getAdminSourceRecord().then((record) => {
      note1.source = record;
      note2.source = record;
    });
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
      });
      UserEdit.addServicePointViaApi(servicePoint.id, userProperties.userId, servicePoint.id);
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: testData.folioInstances[0].barcodes[0],
        loanDate: moment.utc().format(),
        userBarcode: userData.barcode,
        servicePointId: servicePoint.id,
      });
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
      }).then((res) => {
        const itemData = res;
        note1.date = DateTools.getFormattedDateWithTime(new Date(), { withoutComma: true });
        itemData.circulationNotes = [{ noteType: 'Check in', note: note1.title, staffOnly: true }];
        cy.updateItemViaApi(itemData);
      });
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
      })
        .then((res) => {
          const itemData = res;
          note2.date = DateTools.getFormattedDateWithTime(new Date(), { withoutComma: true });
          itemData.circulationNotes = [
            ...itemData.circulationNotes,
            { noteType: 'Check in', note: note2.title, staffOnly: true },
          ];
          cy.updateItemViaApi(itemData);
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
        });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C776 Check in: check in notes (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C776'] },
    () => {
      // Scan item with at least two check in notes in Check In app
      CheckInActions.checkInItemGui(itemBarcode);
      // Check in note modal appears
      CheckInModal.verifyModalTitle();
      CheckInModal.verifyNotesInfo([note2, note1]);
      // Click cancel on check in note modal
      CheckInModal.closeModal();
      CheckInModal.verifyModalIsClosed();
      CheckInPane.checkItemIsNotCheckedIn(itemBarcode);
      // Scan item in Check In app
      CheckInActions.checkInItemGui(itemBarcode);
      // Check in note modal appears
      CheckInModal.verifyModalTitle();
      CheckInModal.verifyNotesInfo([note2, note1]);
      // Click confirm on check in note modal
      CheckInModal.confirmModal();
      // Item is checked in
      CheckInPane.checkResultsInTheRow([itemBarcode]);
      // Check in notes appears in menu
      CheckInActions.checkActionsMenuOptions(['checkInNotes']);
      // Click check in notes
      CheckInActions.openCheckInNotes([note2, note1]);
      CheckInModal.verifyModalIsClosed();
    },
  );
});
