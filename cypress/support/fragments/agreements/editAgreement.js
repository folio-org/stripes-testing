import { including } from '@interactors/html';
import { Pane, Section, Button, Card, Select, TextField, TextArea } from '../../../../interactors';
import KeyValue from '../../../../interactors/key-value';
import AssignLicense from '../licenses/modal/assign-unassign-licenses';
import selectOrganizationModal from '../orders/modals/selectOrganizationModal';

const organizationSection = Section({ id: 'formOrganizations' });
const trashButton = Button({ icon: 'trash' });
const saveButton = Button('Save & close');
const internalContactsSection = Section({ id: 'formInternalContacts' });
const linkUserButton = Button('Link user');
const addInternalContactButton = Button({ id: 'add-contacts-btn' });
const addSupplementaryDocumentsButton = Button({ id: 'add-supplementaryDocs-btn' });
const supplementaryDocumentsCard = Section({ id: 'formSupplementaryDocs' }).find(Card());
const fileButton = Button('or choose file');
const addLicenseButton = Button({ id: 'add-license-btn' });
const linkLicenseButton = Button('Link license');
const licensesSection = Section({ id: 'formLicenses' });
const deleteLicenseButton = licensesSection.find(Button({ icon: 'trash' }));
const addOrganizationButton = Button({ id: 'add-org-btn' });
const linkOrganizationButton = Button('Link organization');

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

  linkLicense(licenseName, status) {
    cy.do([addLicenseButton.click(), linkLicenseButton.click()]);
    cy.wait(1000);
    AssignLicense.verifyModalIsShown();
    AssignLicense.searchForLicense(licenseName);
    AssignLicense.selectLicenseFromSearch(licenseName);
    cy.wait(1000);
    cy.do([Select('Status (this agreement)*').choose(status), saveButton.click()]);
  },

  deleteLicense() {
    cy.do([deleteLicenseButton.click(), saveButton.click()]);
  },

  addOrganization(organizationName, roleName) {
    cy.do([addOrganizationButton.click(), linkOrganizationButton.click()]);
    selectOrganizationModal.findOrganization(organizationName);
    cy.wait(1000);
    cy.xpath("//select[contains(@data-testid, 'rolesFieldArray')]").select(roleName);
  },
};
