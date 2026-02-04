import NotesEholdings from '../../../support/fragments/notes/notesEholdings';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';
import eHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';

describe('Note creation', () => {
  const { user, memberTenant } = parseSanityParameters();
  let urlToEholdings;
  const note = {
    title: `Test Title ${getRandomPostfix()}`,
    details: `Test details ${getRandomPostfix()}`,
  };

  note.title += String().padEnd(65 - note.title.length - 1, 'test');
  note.details += String().padEnd(4000 - note.details.length - 1, 'test');

  before('Setup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);
    eHoldingsProviders
      .getProvidersViaApi()
      .then((providers) => {
        urlToEholdings = `/eholdings/providers/${providers[0].id}`;
      })
      .then(() => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: urlToEholdings,
          waiter: NotesEholdings.waitLoading,
        });
        cy.allure().logCommandSteps();
      });
  });

  it('C1299 Edit a note (spitfire)', { tags: ['dryRun', 'spitfire', 'C1299'] }, () => {
    const newNote = {
      title: `Changed Title ${getRandomPostfix()}`,
      details: `Changed details ${getRandomPostfix()}`,
    };
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.editNote(note.title, newNote.title, newNote.details);
    NotesEholdings.verifyNoteTitle(newNote.title);
    NotesEholdings.openNoteView(newNote.title);
    NotesEholdings.deleteNote();
  });
});
