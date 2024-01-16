import {
  RichEditor,
  TextField,
  Button,
  Select,
  Label,
  including,
  PaneHeader,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const titleTextField = TextField('Note title*');
const saveButton = Button('Save & close');
const selectNoteType = Select({ name: 'type' });

const defaultNote = {
  title: `autotest_title_${getRandomPostfix()}`,
  details: `autotest_details_${getRandomPostfix()}`,
  getShortDetails() {
    return this.details.substring(0, 255);
  },
};
const paneHeader = PaneHeader('New note');
const closeButton = paneHeader.find(Button({ icon: 'times' }));

function getDefaultNote() {
  return defaultNote;
}

export default {
  defaultNote,
  getDefaultNote,

  fill(specialNote = defaultNote) {
    cy.do([
      titleTextField.fillIn(specialNote.title),
      RichEditor({ id: 'note-details-field' }).fillIn(specialNote.details),
    ]);

    cy.wait(100);

    if (specialNote.checkoutApp) cy.do(Label('Check out app').click());
    if (specialNote.usersApp) cy.do(Label('Users app').click());
  },

  save() {
    cy.do(saveButton.click());
    cy.expect(titleTextField.absent());
  },

  chooseSelectTypeByTitle(TypeTitle) {
    cy.do(selectNoteType.choose(TypeTitle));
  },

  verifyNoteTypeExists(TypeTitle) {
    cy.expect(selectNoteType.has({ content: including(TypeTitle) }));
  },

  verifyNewNoteIsDisplayed() {
    cy.expect(titleTextField.exists());
  },

  verifyNewNoteIsNotDisplayed() {
    cy.expect(titleTextField.absent());
  },

  close() {
    cy.do(closeButton.click());
  },
};
