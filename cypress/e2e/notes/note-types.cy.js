import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import usersCard from '../../support/fragments/users/usersCard';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import { randomFourDigitNumber } from '../../support/utils/stringTools';

const fourDigits = randomFourDigitNumber();

describe('Notes', () => {
  let testData;
  let servicePoint;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      testData = userProperties;
      servicePoint = NewServicePoint.getDefaultServicePoint();
      ServicePoints.createViaApi(servicePoint);
      UserEdit.addServicePointViaApi(servicePoint.id, userProperties.userId, servicePoint.id);
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(testData.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C357554 Verify that user cant delete a "Note type" when the "Note" was created (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      const noteType = `Note type ${fourDigits}`;
      const note1 = { title: 'Note 1', details: 'This is Note 1' };
      // Go to "Notes" >> "General".
      cy.login(testData.username, testData.password, {
        path: TopMenu.notesPath,
        waiter: NoteTypes.waitLoading,
      });
      // Create a note type.
      NoteTypes.addNoteType();
      NoteTypes.fillInNoteType(noteType);
      NoteTypes.saveNoteType(noteType);
      // "Edit" and "Delete" icons are displayed in the row with recently created "Note type".
      NoteTypes.checkEditAndDeleteIcons(noteType);
      // Navigate to "Users" app ond open any record.
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.username);
      UsersSearchPane.waitLoading();
      // Scroll down to the "Notes" accordion and click on it.
      usersCard.openNotesSection();
      // Create a new note.
      AgreementsDetails.createNote({ ...note1, checkoutApp: true }, noteType);
      // Return to the "Notes" >> "General".
      cy.visit(TopMenu.notesPath);
      // Verify that the "Delete" icon doesn't display in the row with created "Note type" value at step 4.
      NoteTypes.checkDeleteIconNotDisplayed(noteType);
    },
  );
});
