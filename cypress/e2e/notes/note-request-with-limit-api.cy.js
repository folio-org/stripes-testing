import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import { getRandomLetters } from '../../support/utils/stringTools';
import Notes from '../../support/fragments/notes/notes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';

describe('Notes', () => {
  const noteTitlePrefix = `AT_C360558_Note_${getRandomLetters(10)}`;
  const noteDetails = 'Testing GET request';
  const noteTypeName = 'General note';
  const noteTitles = Array.from({ length: 2 }, (_, i) => `${noteTitlePrefix}_${i}`);

  let user;
  let noteTypeId;
  const noteIds = [];
  let totalNotesWithTypeCount;

  before('Creating user, add note', () => {
    cy.then(() => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiNotesItemCreate.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.uiNotesItemEdit.gui,
        Permissions.uiNotesItemDelete.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;
      });

      NoteTypes.getNoteTypesViaApi().then((noteTypes) => {
        noteTypeId = noteTypes.find((type) => type.name === noteTypeName).id;
      });
    }).then(() => {
      noteTitles.forEach((title) => {
        Notes.createViaApi({
          domain: 'users',
          typeId: noteTypeId,
          title,
          content: noteDetails,
          links: [
            {
              type: 'user',
              id: user.userId,
            },
          ],
        }).then((createdNote) => {
          noteIds.push(createdNote.id);
        });
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    noteIds.forEach((id) => Notes.deleteViaApi(id));
  });

  it(
    'C360558 Check that GET request to the "/notes" endpoint with limit parameter will succeed (spitfire)',
    { tags: ['extendedPath', 'backend', 'spitfire', 'C360558'] },
    () => {
      cy.then(() => {
        cy.getToken(user.username, user.password);

        Notes.getNotesViaApi({ query: `(type.id="${noteTypeId}")` }).then((response) => {
          expect(response.status).to.equal(200);
          expect(
            response.body.notes.every((note) => note.typeId === noteTypeId),
            'All notes should have the expected typeId',
          ).to.equal(true);
          expect(response.body.notes.length).to.be.at.least(2);
        });
      })
        .then(() => {
          Notes.getNotesViaApi({ query: `(type.id="${noteTypeId}")`, limit: 1_000_000 }).then(
            (response) => {
              expect(response.status).to.equal(200);
              expect(
                response.body.notes.every((note) => note.typeId === noteTypeId),
                'All notes should have the expected typeId',
              ).to.equal(true);
              expect(response.body.notes.length).to.be.at.least(2);
              totalNotesWithTypeCount = Number(response.body.totalRecords);
            },
          );
        })
        .then(() => {
          Notes.getNotesViaApi({
            query: `(type.id="${noteTypeId}")`,
            limit: totalNotesWithTypeCount,
          }).then((response) => {
            expect(response.status).to.equal(200);
            expect(
              response.body.notes.every((note) => note.typeId === noteTypeId),
              'All notes should have the expected typeId',
            ).to.equal(true);
            expect(response.body.notes.length).to.equal(totalNotesWithTypeCount);
            expect(Number(response.body.totalRecords)).to.equal(totalNotesWithTypeCount);
          });
        })
        .then(() => {
          Notes.getNotesViaApi({
            query: `(type.id="${noteTypeId}")`,
            limit: totalNotesWithTypeCount - 1,
          }).then((response) => {
            expect(response.status).to.equal(200);
            expect(
              response.body.notes.every((note) => note.typeId === noteTypeId),
              'All notes should have the expected typeId',
            ).to.equal(true);
            expect(response.body.notes.length).to.equal(totalNotesWithTypeCount - 1);
            expect(Number(response.body.totalRecords)).to.equal(totalNotesWithTypeCount);
          });
        });
    },
  );
});
