import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
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
  const testData = {
    customNoteTypeName: `C1304NoteType_${getRandomPostfix()}`,
    updatedNoteTypeName: `C1304NoteTypeUPD_${getRandomPostfix()}`,
  };
  let servicePoint;
  const noteTypeC1304 = NOTE_TYPES.GENERAL;
  const noteC1304 = { title: `Note C1304 ${randomFourDigitNumber()}`, details: 'This is Note 1' };

  before('Creating data', () => {
    cy.getAdminToken();
    NoteTypes.createNoteTypeViaApi({ id: uuid(), name: testData.customNoteTypeName }).then(
      (newNoteType) => {
        testData.customNoteTypeId = newNoteType.id;

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

          servicePoint = NewServicePoint.getDefaultServicePoint();
          ServicePoints.createViaApi(servicePoint);
          UserEdit.addServicePointViaApi(
            servicePoint.id,
            testData.userC1304Properties.userId,
            servicePoint.id,
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
      },
    );
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.userC1304Properties.userId, [
      servicePoint.id,
    ]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.userC1304Properties.userId);
    NoteTypes.deleteNoteTypeViaApi(testData.customNoteTypeId);
  });

  it('C1304 Settings | Edit a note type (spitfire)', { tags: ['extendedPath', 'spitfire'] }, () => {
    cy.login(testData.userC1304Properties.username, testData.userC1304Properties.password, {
      path: TopMenu.notesPath,
      waiter: NoteTypes.waitLoading,
    }).then(() => {
      // wait for page to fully load
      cy.wait(3000);
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
});
