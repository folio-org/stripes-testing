import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Notes from '../../support/fragments/notes/notes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import AssignNote from '../../support/fragments/notes/modal/assign-unassign-notes';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';

describe('Unassign a note', () => {
  const testData = {};
  let assignedNote;
  const noteType = 'General note';

  before('create test data', () => {
    cy.getAdminToken();
    EHoldingsProviders.getProvidersViaApi().then((providers) => {
      expect(providers.length).to.be.greaterThan(2);
      testData.firstProviderId = providers[0]?.id;
      testData.secondProviderId = providers[1]?.id;
    });

    NoteTypes.getNoteTypesViaApi()
      .then((noteTypes) => {
        const foundNoteType = noteTypes.find((type) => type.name === noteType);
        testData.noteTypeId = foundNoteType.id;

        assignedNote = {
          domain: 'eholdings',
          typeId: testData.noteTypeId,
          title: `Assigned Note ${getRandomPostfix()}`,
          content: `Assigned note details ${getRandomPostfix()}`,
          links: [
            {
              type: 'provider',
              id: testData.firstProviderId,
            },
            {
              type: 'provider',
              id: testData.secondProviderId,
            },
          ],
        };

        return Notes.createViaApi(assignedNote).then((createdNote) => {
          testData.noteId = createdNote.id;
        });
      })
      .then(() => {
        cy.createTempUser([
          Permissions.uiNotesAssignUnassign.gui,
          Permissions.uiNotesItemView.gui,
          Permissions.uiNotesItemCreate.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;
        });
      });
  });

  after('delete test data', () => {
    cy.getAdminToken().then(() => {
      Notes.deleteViaApi(testData.noteId);
      Users.deleteViaApi(testData.userProperties.userId);
    });
  });

  it('C1298 Unassign a note (spitfire)', { tags: ['smoke', 'spitfire', 'C1298'] }, () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: `/eholdings/providers/${testData.firstProviderId}`,
      waiter: NotesEholdings.waitLoading,
    });

    NotesEholdings.verifyNoteInList(assignedNote.title);
    NotesEholdings.clickAssignUnassignButton();
    AssignNote.verifyModalIsShown();

    AssignNote.selectAssignedNoteStatusCheckbox();
    AssignNote.verifyDesiredNoteIsShown(assignedNote.title);

    AssignNote.clickCheckboxForNote(assignedNote.title);
    AssignNote.verifyNoteCheckbox(assignedNote.title, false);

    AssignNote.clickSaveButton();
    NotesEholdings.verifyNoteNotInList(assignedNote.title);
  });
});
