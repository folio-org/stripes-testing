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

describe('Check out', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    note: {
      title: `AT_C380719_Note_${getRandomPostfix()}`,
      details: `This is Note 1 - ${getRandomPostfix()}`,
      checkoutApp: true,
      usersApp: false,
    },
    folioInstances: InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: `AT_C380719_FolioInstance_${getRandomPostfix()}`,
      itemsCount: 2,
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
        // Get existing location and create inventory instances for item checkout
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: res,
          });
        });
      })
      .then(() => {
        // Create User A with required permissions (no notes)
        cy.createTempUser([
          Permissions.checkoutAll.gui,
          Permissions.uiNotesAssignUnassign.gui,
          Permissions.uiNotesItemCreate.gui,
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

        // Create User B (will have notes)
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
    'C380719 Verify that note of second user will pop-up when first check outed user didn\'t have notes (without using "End session" button) (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C380719'] },
    () => {
      const itemBarcode1 = testData.folioInstances[0].barcodes[0];
      const itemBarcode2 = testData.folioInstances[0].barcodes[1];

      // Login as User A and navigate to Users app
      cy.login(testData.userA.username, testData.userA.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
        authRefresh: true,
      });

      // Step 1: Fill in the search box with username of "User B" and click on the "Search" button
      UsersSearchPane.searchByUsername(testData.userB.username);
      // Verify search completed and detail view of "User B" is opened in the third pane
      UsersSearchPane.openUser(testData.userB.username);
      UsersSearchPane.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(testData.userB.lastName, testData.userB.firstName);

      // Step 2: Scroll down to the "Notes" accordion button and click on it
      UsersCard.openNotesSection();
      // Verify "Notes" accordion expanded and "No notes found" message displayed
      UsersCard.checkNoNotesInAccordion();

      // Steps 3-5: Add Note to User B
      UsersCard.clickNewNoteButton();
      NewNote.fill(testData.note);
      NewNote.save();
      // Verify new "Note" record was created and User B record is displayed in the third pane
      UsersCard.verifyUserLastFirstNameInCard(testData.userB.lastName, testData.userB.firstName);
      UsersCard.verifyNotesCounter('1');

      // Step 6: Go to the "Check out" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      // Verify "Scan patron card" and "Scan items" panes are displayed
      CheckOutActions.checkIsInterfacesOpened();

      // Step 7: Fill in barcode value of user that doesn't have assigned "Note" records (User A)
      // Step 8: Click on the "Enter" button
      CheckOutActions.checkOutUser(testData.userA.barcode);
      // Verify User A information appears in the "Scan patron card" pane (no note popup expected)
      CheckOutActions.checkPatronInformation();
      CheckOutActions.checkNoteModalNotDisplayed();

      // Step 9: Fill in the "Item" barcode value in input field at "Scan items" pane → Click "Enter" button
      CheckOutActions.checkOutItem(itemBarcode1);
      // Verify information about entered "Item" appears in the "Scan items" pane
      CheckOutActions.checkItemInfo(itemBarcode1, testData.folioInstances[0].instanceTitle);

      // Step 10: Fill in barcode value of user that has assigned "Note" records (User B)
      // Step 11: Click on the "Enter" button
      CheckOutActions.checkOutUser(testData.userB.barcode);
      // Verify User B information appears and pop-up modal window "User note" is displayed
      // Verify "Scan items" pane is displayed without values
      CheckOutActions.checkUserNote(testData.note);
      CheckOutActions.checkPatronInformation();

      // Step 12: Click on the "Close" button
      CheckOutActions.closeNote();
      // Verify the modal window with the note is closed
      CheckOutActions.checkNoteModalNotDisplayed();
      CheckOutActions.checkPatronInformation();

      // Step 13: Fill in the "Item" barcode value in input field at "Scan items" pane → Click "Enter" button
      CheckOutActions.checkOutItem(itemBarcode2);
      // Verify information about entered "Item" appears and no pop-up modal window is displayed
      CheckOutActions.checkItemInfo(itemBarcode2, testData.folioInstances[0].instanceTitle);
      CheckOutActions.checkNoteModalNotDisplayed();
    },
  );
});
