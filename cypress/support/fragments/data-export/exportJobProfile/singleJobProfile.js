import { including } from "bigtest";
import {
  Accordion,
  PaneHeader,
  Button,
  TextField,
  TextArea,
  Select
} from "../../../../../interactors";

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const nameTextfield = TextField('Name*');
const cancelButton = Button('Cancel');

export default {
  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetails(profileDetails) {
    cy.expect([
      TextField('Name*').has({ value: profileDetails.name }),
      Select('Mapping profile*').exists(),
      TextArea('Description').has({ value: profileDetails.description }),
      Accordion({ headline: 'Update information' }).has({ content: including(`Source: ${profileDetails.source}`) })
    ]);
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  editJobProfile(newName) {
    this.clickEditButton();
    cy.do([
      nameTextfield.clear(),
      nameTextfield.fillIn(newName),
    ]);
  },
}
