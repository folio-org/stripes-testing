import Permissions from '../../support/dictionary/permissions';
import NewNote from '../../support/fragments/notes/newNote';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {};
  const noteTitle = `AT_C343246_Note_${getRandomPostfix()}`;
  const noteDetails = `AT_C343246_Details_${getRandomPostfix()}`;
  const note = { title: noteTitle, details: noteDetails, usersApp: true };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      testData.targetUser = userProperties;
    });
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.targetUser.userId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C343246 Users: Add a pop-up note and delete pop-up note (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C343246'] },
    () => {
      // Step 1: Go to Users app and select a user record
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByKeywords(testData.targetUser.userId);
      UsersSearchPane.openUser(testData.targetUser.userId);
      UsersCard.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(
        testData.targetUser.lastName,
        testData.targetUser.firstName,
      );

      // Step 2: Go to Notes accordion, click "New note"
      UsersCard.openNotesSection();
      UsersCard.clickNewNoteButton();

      // Step 3: Fill note title and details, select "Users app" pop-up, save
      NewNote.fill(note);
      NewNote.save();

      // Verify pop-up note modal is displayed with Close and Delete note buttons
      UsersCard.checkPopupNoteDisplayed();
      UsersCard.verifyPopupNote({ title: noteTitle, details: noteDetails });

      // Step 4: Click "Delete note"
      UsersCard.deleteNoteInPopupModal();

      // Verify note does not exist under Notes accordion
      UsersCard.verifyNotesCounter(0);
      UsersCard.openNotesSection();
      UsersCard.checkNoNotesInAccordion();
    },
  );
});
