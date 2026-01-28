import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import NewNote from '../../support/fragments/notes/newNote';
import getRandomPostfix from '../../support/utils/stringTools';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Check out', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    note1: {
      title: `AT_C380513_Note1_${getRandomPostfix()}`,
      details: `This is Note 1 - ${getRandomPostfix()}`,
      checkoutApp: true,
      usersApp: false,
    },
    note2: {
      title: `AT_C380513_Note2_${getRandomPostfix()}`,
      details: `This is Note 2 - ${getRandomPostfix()}`,
      checkoutApp: true,
      usersApp: false,
    },
    folioInstances: InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: `AT_C380513_FolioInstance_${getRandomPostfix()}`,
    }),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    // Create service point
    cy.then(() => {
      testData.servicePoint = NewServicePoint.getDefaultServicePoint();
      ServicePoints.createViaApi(testData.servicePoint);
    })
      .then(() => {
        // Get existing location and create inventory instance for item checkout
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: res,
          });
        });
      })
      .then(() => {
        // Create User A with required permissions
        cy.createTempUser([
          Permissions.checkoutAll.gui,
          Permissions.uiNotesAssignUnassign.gui,
          Permissions.uiNotesItemCreate.gui,
          Permissions.uiNotesItemDelete.gui,
          Permissions.uiNotesItemEdit.gui,
          Permissions.uiNotesItemView.gui,
          Permissions.uiUsersView.gui,
        ]).then((userAProperties) => {
          testData.userA = userAProperties;
          // Add service point to User A
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.userA.userId,
            testData.servicePoint.id,
          );
        });

        // Create User B
        cy.createTempUser([]).then((userBProperties) => {
          testData.userB = userBProperties;
          // Add service point to User B
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.userB.userId,
            testData.servicePoint.id,
          );
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.then(() => {
      UserEdit.changeServicePointPreferenceViaApi(testData.userA.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.userB.userId, [
        testData.servicePoint.id,
      ]);
    }).then(() => {
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.folioInstances[0]);
    });
  });

  it(
    'C380513 Verify that "Note for patron" pop-up for two patrons on a row (use "End session" button) (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C380513'] },
    () => {
      const itemBarcode = testData.folioInstances[0].barcodes[0];

      // Login as User A and navigate to Users app
      cy.login(testData.userA.username, testData.userA.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
        authRefresh: true,
      });

      // Step 1: Scroll down to the "Notes" accordion button and click on it
      UsersSearchPane.searchByUsername(testData.userA.username);
      UsersSearchPane.openUser(testData.userA.username);
      UsersSearchPane.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(testData.userA.lastName, testData.userA.firstName);
      UsersCard.openNotesSection();

      // Steps 2-4: Add Note 1 to User A
      UsersCard.clickNewNoteButton();
      NewNote.fill(testData.note1);
      NewNote.save();
      UsersCard.verifyUserLastFirstNameInCard(testData.userA.lastName, testData.userA.firstName);
      UsersCard.verifyNotesCounter('1');

      // Step 5: Fill in the input field placed at "User search" panel with the name of User B > Search
      cy.wait(3000); // wait for the search to complete
      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifySearchPaneIsEmpty();
      UsersSearchPane.searchByUsername(testData.userB.username);

      // Step 7: Open User B record by clicking on his name
      UsersSearchPane.openUser(testData.userB.username);
      UsersSearchPane.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(testData.userB.lastName, testData.userB.firstName);

      // Step 8: Scroll down to the "Notes" accordion button and click on it
      UsersCard.openNotesSection();

      // Steps 9-11: Add Note 2 to User B
      UsersCard.clickNewNoteButton();
      NewNote.fill(testData.note2);
      NewNote.save();
      UsersCard.verifyUserLastFirstNameInCard(testData.userB.lastName, testData.userB.firstName);
      UsersCard.verifyNotesCounter('1');

      // Step 12: Navigate to the "Check out" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();

      // Step 13: Fill in User A barcode number in the input field at "Scan patron card" pane
      // Step 14: Click on the "Enter" button
      CheckOutActions.checkOutUser(testData.userA.barcode);
      // Verify modal window "User note" with the note is displayed
      CheckOutActions.checkUserNote(testData.note1);

      // Step 15: Click on the "Close" button
      CheckOutActions.closeNote();
      // Verify the modal window is closed and user information is displayed
      CheckOutActions.checkNoteModalNotDisplayed();
      CheckOutActions.checkPatronInformation();

      // Step 16: Click on the "End session" button
      CheckOutActions.endCheckOutSession();
      // Verify "Scan patron card" and "Scan items" panes are displayed with no values
      CheckOutActions.checkIsInterfacesOpened();

      // Step 17: Fill in User B barcode number in the input field at "Scan patron card" pane
      // Step 18: Click on the "Enter" button
      CheckOutActions.checkOutUser(testData.userB.barcode);
      // Verify modal window "User note" with the note is displayed
      CheckOutActions.checkUserNote(testData.note2);

      // Step 19: Click on the "Close" button
      CheckOutActions.closeNote();
      // Verify the modal window is closed and user information is displayed
      CheckOutActions.checkNoteModalNotDisplayed();
      CheckOutActions.checkPatronInformation();

      // Step 20: Input any valid item barcode in input field at "Scan items" pane → Click "Enter" button
      CheckOutActions.checkOutItem(itemBarcode);
      // Verify item is checked out successfully
      CheckOutActions.checkItemInfo(itemBarcode, testData.folioInstances[0].instanceTitle);
      // Verify modals with user notes do NOT appear
      CheckOutActions.checkNoteModalNotDisplayed();
    },
  );
});
