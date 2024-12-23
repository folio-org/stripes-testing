import { Permissions } from '../../../support/dictionary';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Notes', () => {
  const testData = {
    noteType: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      NoteTypes.createNoteTypeViaApi().then((noteType) => {
        testData.noteType = noteType;
      });
    });

    cy.createTempUser([Permissions.notesSettingsViewGeneralSettings.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.notesPath,
        waiter: NoteTypes.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    NoteTypes.deleteNoteTypeViaApi(testData.noteType.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380447 Settings | View a note type (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C380447'] },
    () => {
      // * "New" button is disabled
      // * "Edit" (pencil) icon doesn't display under "Actions" column
      // * "Delete" (trash can) icon doesn't display under "Actions" column
      NoteTypes.checkNoteTypeButtonsStates({
        name: testData.noteType.name,
        addNewButton: { present: false },
        editButton: { present: false },
        deleteButton: { present: false },
      });
    },
  );
});
