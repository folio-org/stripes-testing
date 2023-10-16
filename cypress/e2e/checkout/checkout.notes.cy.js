import { HTML, including } from '@interactors/html';

import TopMenu from '../../support/fragments/topMenu';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import usersCard from '../../support/fragments/users/usersCard';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { TestTypes, DevTeams, Parallelization, Permissions } from '../../support/dictionary';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Check out - Notes', () => {
  let testData;
  const instanceData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const note1 = { title: 'Note 1', details: 'This is Note 1' };
  const note2 = { title: 'Note 2', details: 'This is Note 2' };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.checkoutAll.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
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
      cy.login(testData.username, testData.password);
    });
  });

  beforeEach('Create notes', () => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByUsername(testData.username);
    UsersSearchPane.waitLoading();
    // Scroll down to "Notes" accordion button and click on it.
    usersCard.openNotesSection();
    // Create Note 1
    AgreementsDetails.createNote({ ...note1, checkoutApp: true });
    // Scroll down to "Notes" accordion button and click on it.
    usersCard.openNotesSection();
    // Create Note 2
    AgreementsDetails.createNote({ ...note2, checkoutApp: true });
    // Navigate to "Check out" app
    cy.visit(TopMenu.checkOutPath);
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(testData.userId, [instanceData.servicePoint.id]);
    ServicePoints.deleteViaApi(instanceData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData.folioInstances[0],
      servicePoint: instanceData.servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C356781: Verify that all notes assigned to user pop up when user scan patron card (“Delete” option) (Spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      // Fill in user barcode number in the input field at "Scan patron card" pane → Click "Enter" button.
      CheckOutActions.checkOutUser(testData.barcode);
      // Modal window "Note for patron" with the Note 1 is displayed.
      CheckOutActions.checkUserNote(note1);
      // Click on the "Delete note" button.
      CheckOutActions.deleteNote();
      // Modal window "Note for patron" with the Note 2 is displayed
      CheckOutActions.checkUserNote(note2);
      // Click on the "Delete note" button.
      CheckOutActions.deleteNote();
      // Open user Details
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.username);
      UsersSearchPane.waitLoading();
      // Scroll down to "Notes" accordion button and click on it.
      usersCard.openNotesSection();
      // "Notes" accordion button expanded and the message "No notes found" displayed.
      cy.expect(HTML(including('No notes found')).exists());
    },
  );

  it(
    'C380512: Verify that all notes assigned to user pop up when user scan patron card (“Close” option) (Spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      // Fill in user barcode number in the input field at "Scan patron card" pane → Click "Enter" button.
      CheckOutActions.checkOutUser(testData.barcode);
      // Modal window "Note for patron" with the Note 1 is displayed.
      CheckOutActions.checkUserNote(note1);
      // Click on the "Close" button.
      CheckOutActions.closeNote();
      // Modal window "Note for patron" with the Note 2 is displayed.
      CheckOutActions.checkUserNote(note2);
      // Click on the "Close" button.
      CheckOutActions.closeNote();
      // Input any valid item barcode in input field at "Scan items" pane → Click "Enter" button
      CheckOutActions.checkOutItem(instanceData.folioInstances[0].barcodes[0]);
      // Modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
      // Repeat step "Checkout Item"
      CheckOutActions.checkOutItem(instanceData.folioInstances[0].barcodes[0]);
      // Modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
    },
  );
});
