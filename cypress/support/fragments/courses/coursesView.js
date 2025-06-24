import { HTML, including } from '@interactors/html';
import {
  Button,
  Section,
  or,
  MultiColumnListCell,
  MultiColumnListRow,
} from '../../../../interactors';
import Courses from './courses';
import NoteEditForm from '../notes/existingNoteEdit';

const notesSection = Section({ id: 'viewCourseNotes' });
const newNoteButton = Button({ id: 'note-create-button' });

export default {
  close() {
    cy.do(Button({ icon: 'times' }).click());
    Courses.waitLoading();
  },

  waitLoading() {
    cy.expect(or([notesSection.exists(), Button('Actions').exists()]));
  },

  checkNotesSectionContent(notes = []) {
    // wait for section to load
    Courses.waitLoading();

    notes.forEach((note, index) => {
      cy.expect([
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(`Title: ${note.title}`) }),
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(`Details: ${note.details.slice(0, 255)}`) }),
        notesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: note.type }),
      ]);
    });

    if (!notes.length) {
      cy.expect(notesSection.find(HTML('No notes found')).exists());
    }
  },
  openAddNewNoteForm() {
    cy.do(notesSection.find(newNoteButton).click());
    NoteEditForm.waitLoading();

    return NoteEditForm;
  },

  openCourseNotes(row) {
    cy.do(notesSection.find(MultiColumnListRow({ indexRow: `row-${row}` })).click());
  },
};
