import { HTML, including } from '@interactors/html';
import { Permissions } from '../../support/dictionary';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Check out', () => {
  let testData;
  const instanceData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const note1 = { title: 'Note 1', details: 'This is Note 1' };
  const note2 = { title: 'Note 2', details: 'This is Note 2' };
  const noteToCheck = { title: 'Note ', details: 'This is Note ' };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.checkoutAll.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiUsersView.gui,
    ]).then((createdUserProperties) => {
      testData = createdUserProperties;
      ServicePoints.createViaApi(instanceData.servicePoint);
      instanceData.defaultLocation = Location.getDefaultLocation(instanceData.servicePoint.id);
      Location.createViaApi(instanceData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: instanceData.folioInstances,
          location,
        });
      });
      UserEdit.addServicePointViaApi(
        instanceData.servicePoint.id,
        createdUserProperties.userId,
        instanceData.servicePoint.id,
      );
      cy.waitForAuthRefresh(() => {
        cy.login(testData.username, testData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        cy.reload();
        UsersSearchPane.waitLoading();
      }, 20_000);
    });
  });

  beforeEach('Create notes', () => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByUsername(testData.username);
    UsersSearchPane.waitLoading();
    UsersSearchPane.openUser(testData.username);
    // Scroll down to "Notes" accordion button and click on it.
    UsersCard.openNotesSection();
    // Create Note 1
    AgreementsDetails.createNote({ ...note1, checkoutApp: true });
    // Scroll down to "Notes" accordion button and click on it.
    UsersCard.openNotesSection();
    // Create Note 2
    AgreementsDetails.createNote({ ...note2, checkoutApp: true });
    // Navigate to "Check out" app
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
    Checkout.waitLoading();
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.userId, [instanceData.servicePoint.id]);
    ServicePoints.deleteViaApi(instanceData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData.folioInstances[0],
      servicePoint: instanceData.servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.userId);
  });

  // May be failing because of this bug (https://issues.folio.org/browse/STSMACOM-783)
  it(
    'C356781 Verify that all notes assigned to user pop up when user scan patron card (“Delete” option) (Spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire', 'C356781'] },
    () => {
      // Fill in user barcode number in the input field at "Scan patron card" pane → Click "Enter" button.
      CheckOutActions.checkOutUser(testData.barcode);
      // Modal window "Note for patron" with the Note 1 is displayed.
      CheckOutActions.checkUserNote(noteToCheck);
      // Click on the "Delete note" button.
      CheckOutActions.deleteNote();
      // Modal window "Note for patron" with the Note 2 is displayed
      CheckOutActions.checkUserNote(noteToCheck);
      // Click on the "Delete note" button.
      CheckOutActions.deleteNote();
      // Open user Details
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifySearchPaneIsEmpty();
      UsersSearchPane.searchByUsername(testData.username);
      UsersSearchPane.openUser(testData.username);
      UsersSearchPane.waitLoading();
      // Scroll down to "Notes" accordion button and click on it.
      UsersCard.openNotesSection();
      // "Notes" accordion button expanded and the message "No notes found" displayed.
      cy.expect(HTML(including('No notes found')).exists());
    },
  );

  // May be failing because of this bug (https://issues.folio.org/browse/STSMACOM-783)
  it(
    'C380512 Verify that all notes assigned to user pop up when user scan patron card (“Close” option) (Spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C380512'] },
    () => {
      const itemBarcode = instanceData.folioInstances[0].barcodes[0];
      // Fill in user barcode number in the input field at "Scan patron card" pane → Click "Enter" button.
      CheckOutActions.checkOutUser(testData.barcode);
      // Modal window "Note for patron" with the Note 1 is displayed.
      CheckOutActions.checkUserNote(noteToCheck);
      // Click on the "Close" button.
      CheckOutActions.closeNote();
      // Modal window "Note for patron" with the Note 2 is displayed.
      CheckOutActions.checkUserNote(noteToCheck);
      // Click on the "Close" button.
      CheckOutActions.closeNote();
      // Input any valid item barcode in input field at "Scan items" pane → Click "Enter" button
      CheckOutActions.checkOutItem(itemBarcode);
      // Modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
      // Repeat step "Checkout Item"
      CheckOutActions.checkOutItem(itemBarcode);
      // Modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
      // Repeat step "Checkout Item" one more time
      CheckOutActions.checkOutItem(itemBarcode);
      // Modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
    },
  );
});
