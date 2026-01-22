/* eslint-disable no-unused-vars */
import uuid from 'uuid';
import moment from 'moment/moment';

import { parseSanityParameters } from '../../../support/utils/users';
import { Locations } from '../../../support/fragments/settings/tenant';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import CheckInModal from '../../../support/fragments/check-in-actions/checkInModal';
import CheckInPane from '../../../support/fragments/check-in-actions/checkInPane';
import DateTools from '../../../support/utils/dateTools';
import UserEdit from '../../../support/fragments/users/userEdit';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import Checkout from '../../../support/fragments/checkout/checkout';
import TopMenu from '../../../support/fragments/topMenu';

describe('Check in', () => {
  const { user, memberTenant } = parseSanityParameters();
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    requestsId: '',
  };
  const note1 = { title: 'Note 1', details: 'This is Note 1', source: 'ADMINISTRATOR, DIKU' };
  const note2 = { title: 'Note 2', details: 'This is Note 2', source: 'ADMINISTRATOR, DIKU' };
  const itemBarcode = testData.folioInstances[0].barcodes[0];
  const servicePoint = {};
  let defaultLocation = null;

  before('Creating test data', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);
    cy.then(() => {
      cy.getUserDetailsByUsername(user.username)
        .then((details) => {
          user.id = details.id;
          user.personal = details.personal;
          user.barcode = details.barcode;
        })
        .then(() => {
          cy.getUserServicePoints(user.id).then((sp) => {
            servicePoint.id = sp[0].defaultServicePointId;
          });
        });

      cy.getAdminSourceRecord().then((record) => {
        note1.source = record;
        note2.source = record;
      });
      // Defensive cleanup
      InventoryInstances.deleteInstanceByTitleViaApi(testData.folioInstances[0].instanceTitle);
    }).then(() => {
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      Locations.createViaApi(defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: testData.folioInstances[0].barcodes[0],
        loanDate: moment.utc().format(),
        userBarcode: user.barcode,
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
      }).then((res) => {
        const itemData = res;
        note2.date = DateTools.getFormattedDateWithTime(new Date(), { withoutComma: true });
        itemData.circulationNotes = [
          ...itemData.circulationNotes,
          { noteType: 'Check in', note: note2.title, staffOnly: true },
        ];
        cy.updateItemViaApi(itemData);
      });
    });
  });

  after('Deleting test data', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);
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
    if (defaultLocation) {
      Locations.deleteViaApi(defaultLocation);
    }
  });

  it('C776 Check in: check in notes (vega) (TaaS)', { tags: ['dryRun', 'vega', 'C776'] }, () => {
    cy.login(user.username, user.password, {
      path: TopMenu.checkInPath,
      waiter: CheckInActions.waitLoading,
    });
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
  });
});
