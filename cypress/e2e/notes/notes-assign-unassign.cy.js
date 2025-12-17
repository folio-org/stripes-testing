import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Notes from '../../support/fragments/notes/notes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import AssignNote from '../../support/fragments/notes/modal/assign-unassign-notes';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';

describe('Notes assign and unassign', () => {
  const testData = {};
  let unassignedNote;
  let assignedNote;
  const desiredName = 'General note';

  before('Creating data', () => {
    cy.getAdminToken();
    EHoldingsProviders.getProvidersViaApi().then((providers) => {
      expect(providers.length).to.be.greaterThan(2);
      testData.firstProviderId = providers[0]?.id;
      testData.secondProviderId = providers[1]?.id;
    });

    NoteTypes.getNoteTypesViaApi()
      .then((noteTypes) => {
        const foundNoteType = noteTypes.find((type) => type.name === desiredName);
        testData.noteTypeId = foundNoteType.id;

        unassignedNote = {
          domain: 'eholdings',
          typeId: testData.noteTypeId,
          title: `Unassigned Note1 ${getRandomPostfix()}`,
          content: `Unassigned note details ${getRandomPostfix()}`,
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

        assignedNote = {
          domain: 'eholdings',
          typeId: testData.noteTypeId,
          title: `Assigned Note1 ${getRandomPostfix()}`,
          content: `Assigned note details ${getRandomPostfix()}`,
          links: [
            {
              type: 'provider',
              id: testData.secondProviderId,
            },
          ],
        };

        return Notes.createViaApi(unassignedNote).then((createdUnassignedNote) => {
          testData.unassignedNoteId = createdUnassignedNote.id;
        });
      })
      .then(() => Notes.createViaApi(assignedNote).then((createdAssignedNote) => {
        testData.assignedNoteId = createdAssignedNote.id;
      }))
      .then(() => {
        cy.createTempUser([
          Permissions.uiNotesAssignUnassign.gui,
          Permissions.uiNotesItemView.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;
        });
      });
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    Notes.deleteViaApi(testData.unassignedNoteId);
    Notes.deleteViaApi(testData.assignedNoteId);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C3629 Notes: Can assign and unassign a note (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C3629'] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: `/eholdings/providers/${testData.secondProviderId}`,
        waiter: NotesEholdings.waitLoading,
      });

      NotesEholdings.verifyNoteInList(assignedNote.title);
      NotesEholdings.clickAssignUnassignButton();
      AssignNote.verifyModalIsShown();

      AssignNote.selectAssignedNoteStatusCheckbox();

      AssignNote.verifyDesiredNoteIsShown(assignedNote.title);
      AssignNote.verifyNoteCheckboxDisabled(assignedNote.title);

      AssignNote.clickCheckboxForNote(unassignedNote.title);
      AssignNote.verifyNoteCheckbox(unassignedNote.title, false);

      AssignNote.clickSaveButton();

      NotesEholdings.verifyNoteInList(assignedNote.title);
      NotesEholdings.verifyNoteNotInList(unassignedNote.title);
    },
  );
});
