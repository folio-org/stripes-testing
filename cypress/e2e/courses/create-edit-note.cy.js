import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { NOTE_TYPES } from '../../support/constants';
import Courses from '../../support/fragments/courses/courses';
import CoursesView from '../../support/fragments/courses/coursesView';
import ExistingNoteEdit from '../../support/fragments/notes/existingNoteEdit';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';
import Notes from '../../support/fragments/notes/notes';

describe('Course Reserves', () => {
  describe('Courses', () => {
    const testData = {
      course: {
        name: '',
      },
      note: {
        title: `autotest_note_tile [${randomFourDigitNumber()}]`,
        details: `autotest_note_tile [${randomFourDigitNumber()}]`,
        type: NOTE_TYPES.GENERAL,
      },
      changedNote: {
        title: `232autotest_note_tile [${randomFourDigitNumber()}]`,
        details: `222autotest_note_tile [${randomFourDigitNumber()}]`,
        type: NOTE_TYPES.GENERAL,
      },
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Courses.retrieveCoursesViaAPI().then((body) => {
          testData.course.id = body[0].id;
          testData.course.name = body[0].name;
        });
        cy.createTempUser([
          Permissions.coursesReadAll.gui,
          Permissions.uiNotesItemCreate.gui,
          Permissions.uiNotesItemView.gui,
          Permissions.uiNotesItemEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: `${TopMenu.coursesPath}?sort=name`,
            waiter: Courses.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      /* delete all test objects created in precondition if possible */
      cy.getAdminToken().then(() => {
        Notes.deleteNotesForCoursesViaApi(testData.course.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C421983 Courses > Create and edit  a note (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C421983'] },
      () => {
        Courses.verifyExistingCourseIsDisplayed(testData.course.name);
        // #1 Open any "Course" record in second pane by clicking on it
        Courses.openCourseWithExpectedName(testData.course.name);

        // #2 Click on "New" button in "Notes" accordion
        const NoteEditForm = CoursesView.openAddNewNoteForm();

        // #3 * Select any note type
        NoteEditForm.fillNoteFields(testData.note);
        NoteEditForm.saveNote();
        CoursesView.checkNotesSectionContent([testData.note]);

        // #4 Click "Edit" link in a row with added note
        CoursesView.openCourseNotes(0);

        // #5 * Update note
        ExistingNoteView.gotoEdit();
        ExistingNoteEdit.waitLoading();
        ExistingNoteEdit.fillNoteFields(testData.changedNote);
        ExistingNoteEdit.saveNote();

        // #5 * A row with updated note is shown in "Notes" section
        CoursesView.checkNotesSectionContent([testData.changedNote]);
      },
    );
  });
});
