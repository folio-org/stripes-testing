import { including } from 'bigtest';
import {
  Accordion,
  PaneHeader,
  Button,
  TextField,
  TextArea,
  Select,
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const nameTextfield = TextField('Name*');
const cancelButton = Button('Cancel');

export default {
  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetailsEditable() {
    cy.expect([
      TextField('Name*').exists(),
      Select('Mapping profile*').exists(),
      TextArea('Description').exists(),
    ]);
  },

  verifySource(source) {
    cy.expect(
      Accordion({ headline: 'Update information' }).has({
        content: including(`Source: ${source}`),
      }),
    );
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
  },

  clickDuplicateButton() {
    cy.do(duplicateButton.click());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  editJobProfile(newName) {
    cy.do([nameTextfield.clear(), nameTextfield.fillIn(newName)]);
  },
};
