import { including } from '@interactors/html';
import { Pane, Section, Button, Card, Select, TextField, TextArea } from '../../../../interactors';
import KeyValue from '../../../../interactors/key-value';

const organizationSection = Section({ id: 'formOrganizations' });
const trashButton = Button({ icon: 'trash' });
const saveButton = Button('Save & close');
const internalContactsSection = Section({ id: 'formInternalContacts' });
const linkUserButton = Button('Link user');
const addInternalContactButton = Button({ id: 'add-contacts-btn' });
const addSupplementaryDocumentsButton = Button({ id: 'add-supplementaryDocs-btn' });
const supplementaryDocumentsCard = Section({ id: 'formSupplementaryDocs' }).find(Card());
const fileButton = Button('or choose file');

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'pane-agreement-form' }).exists());
  },

  removeOrganization() {
    cy.do(organizationSection.find(trashButton).click());
  },

  saveAndClose() {
    cy.do(saveButton.click());
  },

  clickAddInternalContact() {
    cy.do(addInternalContactButton.click());
  },

  clickLinkUser() {
    cy.do(linkUserButton.click());
  },

  verifyInternalContactIsShown(userName) {
    cy.expect(internalContactsSection.find(Card(including(userName))).exists());
  },

  clickAddSupplementaryDocuments() {
    cy.do(addSupplementaryDocumentsButton.click());
  },

  setRoleByName(userName, roleName) {
    cy.do(
      internalContactsSection
        .find(Card(including(`user ${userName}`)))
        .find(Select())
        .choose(roleName),
    );
  },

  fillSupplementaryDocumentsFields({ name, category, note, location, url }) {
    cy.do([
      supplementaryDocumentsCard.find(TextField(including('Name'))).fillIn(name),
      supplementaryDocumentsCard.find(Select('Category')).choose(category),
      supplementaryDocumentsCard.find(TextArea('Note')).fillIn(note),
      supplementaryDocumentsCard.find(TextField('Physical location')).fillIn(location),
      supplementaryDocumentsCard.find(TextField('URL')).fillIn(url),
    ]);
  },

  uploadFile(fileName) {
    cy.do(fileButton.has({ disabled: false }));
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  verifyFileIsUploadedToSupplementaryDocument(fileName) {
    cy.do([supplementaryDocumentsCard.find(KeyValue({ value: fileName })).exists()]);
  },
};
