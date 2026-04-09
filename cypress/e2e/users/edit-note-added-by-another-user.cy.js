import Permissions from '../../support/dictionary/permissions';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteEdit from '../../support/fragments/notes/existingNoteEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import Notes from '../../support/fragments/notes/notes';
import DateTools from '../../support/utils/dateTools';

describe('Users', () => {
  const testData = {};
  const noteTitle = `AT_C422059_Note_${getRandomPostfix()}`;
  const noteDetails = `AT_C422059_Details_${getRandomPostfix()}`;
  const updatedNoteTitle = `AT_C422059_Updated_${getRandomPostfix()}`;
  const updatedNoteDetails = `AT_C422059_UpdatedDetails_${getRandomPostfix()}`;
  const note = { title: noteTitle, details: noteDetails };
  const updatedNote = { title: updatedNoteTitle, details: updatedNoteDetails };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      testData.targetUser = userProperties;
    });
    cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiNotesItemCreate.gui]).then(
      (userProperties) => {
        testData.userA = userProperties;
      },
    );
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
    ]).then((userProperties) => {
      testData.userB = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.targetUser.userId);
    Users.deleteViaApi(testData.userA.userId);
    Users.deleteViaApi(testData.userB.userId);
  });

  it(
    'C422059 Users: edit a note added by another user (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C422059'] },
    () => {
      // Step 1-2: Login as User A, filter Active users, search and open target user
      cy.login(testData.userA.username, testData.userA.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
        authRefresh: true,
      });
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByKeywords(testData.targetUser.userId);
      UsersSearchPane.openUser(testData.targetUser.userId);
      UsersCard.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(
        testData.targetUser.lastName,
        testData.targetUser.firstName,
      );

      // Step 3: Expand Notes accordion, click "New note"
      UsersCard.openNotesSection();
      UsersCard.clickNewNoteButton();

      // Step 4: Fill note title and details, save
      NewNote.fill(note);
      NewNote.save();
      UsersCard.verifyNotesCounter(1);

      // Step 5: Login as User B, go to Users app
      cy.login(testData.userB.username, testData.userB.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });

      // Step 6: Search for the target user
      UsersSearchPane.searchByKeywords(testData.targetUser.userId);
      UsersSearchPane.openUser(testData.targetUser.userId);
      UsersCard.waitLoading();
      UsersCard.verifyUserLastFirstNameInCard(
        testData.targetUser.lastName,
        testData.targetUser.firstName,
      );

      // Step 7: Expand Notes accordion, verify note exists
      UsersCard.verifyNotesCounter(1);
      UsersCard.openNotesSection();
      UsersCard.verifyNoteInList(noteTitle);

      // Step 8: Click Edit on the note
      UsersCard.openNoteForEdit(noteTitle);
      ExistingNoteEdit.waitLoading();

      const currentDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

      // Step 9: Click "Record last updated" accordion, verify source = User A
      Notes.toggeMetadataAccordion();
      Notes.verifyMetadataContent({
        updated: currentDate,
        updatedBy: testData.userA.username,
        created: currentDate,
        createdBy: testData.userA.username,
      });

      // Step 10: Update note fields, save
      ExistingNoteEdit.fillNoteFields(updatedNote);
      ExistingNoteEdit.saveNote();

      // Step 11: Expand Notes accordion, verify updated note is shown
      UsersCard.openNotesSection();
      UsersCard.verifyNoteInList(updatedNoteTitle);
    },
  );
});
