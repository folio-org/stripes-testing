import { Button, KeyValue, Section } from '../../../../interactors';
import AgreementDetails from '../agreements/agreementsDetails';
import ExistingNoteEdit from './existingNoteEdit';

const section = Section({ id: 'pane-note-view' });
const title = section.find(KeyValue('Note title'));
const details = section.find(KeyValue('Details'));

const closeButton = section.find(Button({ icon: 'times' }));
const actionsButton = Button('Actions');
const editButton = Button('Edit');

export default {
  waitLoading: () => {
    cy.expect(title.exists());
  },

  gotoEdit: () => {
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());

    cy.do(editButton.click());
    ExistingNoteEdit.waitLoading();
  },

  checkProperties: (note) => {
    cy.expect(title.has({ value: note.title }));
    cy.expect(details.has({ value: note.details }));
  },

  close: () => {
    cy.do(closeButton.click());
    cy.expect(section.absent());
    AgreementDetails.waitLoading();
  }
};
