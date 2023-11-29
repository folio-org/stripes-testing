import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';
import { NOTE_TYPES } from '../../support/constants';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteEdit from '../../support/fragments/notes/existingNoteEdit';

describe('Notes', () => {
  const fourDigits = randomFourDigitNumber();
  const testData = {
    customNoteTypeName: `C1304NoteType_${getRandomPostfix()}`,
    updatedNoteTypeName: `C1304NoteTypeUPD_${getRandomPostfix()}`,
  };
  let servicePoint;
  const noteTypeC1304 = NOTE_TYPES.GENERAL;
  const noteC1304 = { title: `Note ${randomFourDigitNumber()}`, details: 'This is Note 1' };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      testData.userProperties = userProperties;
      servicePoint = NewServicePoint.getDefaultServicePoint();
      ServicePoints.createViaApi(servicePoint);
      UserEdit.addServicePointViaApi(
        servicePoint.id,
        testData.userProperties.userId,
        servicePoint.id,
      );

      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.licensesSearchAndView.gui,
        Permissions.uiRequestsView.gui,
        Permissions.coursesAll.gui,
        Permissions.uiNotesAssignUnassign.gui,
        Permissions.uiNotesItemCreate.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.uiNotesItemEdit.gui,
        Permissions.uiNotesSettingsEdit.gui,
      ]).then((userC1304Properties) => {
        testData.userC1304Properties = userC1304Properties;

        UserEdit.addServicePointViaApi(
          servicePoint.id,
          testData.userC1304Properties.userId,
          servicePoint.id,
        );

        NoteTypes.createNoteTypeViaApi({ id: uuid(), name: testData.customNoteTypeName }).then(
          (newNoteType) => {
            testData.customNoteTypeId = newNoteType.id;
          },
        );

        cy.loginAsAdmin().then(() => {
          cy.visit(TopMenu.usersPath);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByUsername(testData.userC1304Properties.username);
          UsersSearchPane.waitLoading();
          UsersCard.openNotesSection();
          AgreementsDetails.createNote({ ...noteC1304, checkoutApp: false }, noteTypeC1304);
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.userProperties.userId, [servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(testData.userC1304Properties.userId, [
      servicePoint.id,
    ]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.userProperties.userId);
    Users.deleteViaApi(testData.userC1304Properties.userId);
    NoteTypes.deleteNoteTypeViaApi(testData.customNoteTypeId);
  });

  it(
    'C357554 Verify that user cant delete a "Note type" when the "Note" was created (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      const noteType = `Note type ${fourDigits}`;
      const note1 = { title: 'Note 1', details: 'This is Note 1' };
      // Go to "Notes" >> "General".
      cy.login(testData.userProperties.username, testData.userProperties.password, {
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
      UsersSearchPane.searchByUsername(testData.userProperties.username);
      UsersSearchPane.waitLoading();
      // Scroll down to the "Notes" accordion and click on it.
      UsersCard.openNotesSection();
      // Create a new note.
      AgreementsDetails.createNote({ ...note1, checkoutApp: true }, noteType);
      // Return to the "Notes" >> "General".
      cy.visit(TopMenu.notesPath);
      // Verify that the "Delete" icon doesn't display in the row with created "Note type" value at step 4.
      NoteTypes.checkDeleteIconNotDisplayed(noteType);
    },
  );

  it('C1304 Settings | Edit a note type (spitfire)', { tags: ['extendedPath', 'spitfire'] }, () => {
    cy.login(testData.userC1304Properties.username, testData.userC1304Properties.password, {
      path: TopMenu.notesPath,
      waiter: NoteTypes.waitLoading,
    });
    NoteTypes.checkNewButtonState();
    NoteTypes.clickEditNoteType(testData.customNoteTypeName);
    NoteTypes.checkNoteButtonsState();
    NoteTypes.fillInNoteType(testData.updatedNoteTypeName);
    NoteTypes.saveNoteType(testData.updatedNoteTypeName);

    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByUsername(testData.userC1304Properties.username);
    UsersSearchPane.waitLoading();
    UsersCard.openNotesSection();
    UsersCard.clickNewNoteButton();
    NewNote.verifyNoteTypeExists(testData.updatedNoteTypeName);
    NewNote.close();
    UsersCard.openNotesSection();
    UsersCard.openNoteForEdit(noteC1304.title);
    ExistingNoteEdit.waitLoading();
    NewNote.verifyNoteTypeExists(testData.updatedNoteTypeName);
  });
});
