
import {
  Button,
  HTML,
  including,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  TextField
} from '../../../../../interactors';
import FinanceHelper from '../../finance/financeHelper';

const nameField = TextField({ placeholder: 'name' });
const descriptionField = TextField({ placeholder: 'description' });
const deletePrefixModal = Modal('Delete prefix');
const deleteSuffixModal = Modal('Delete suffix');
const cannotDeletePrefixModal = Modal('Cannot delete the prefix');
const cannotDeleteSuffixModal = Modal('Cannot delete the suffix');
const buttonOkay = Button('Okay');
const saveButton = Button('Save');
const deleteButton = Button('Delete');
const editEntityButton = Button({ icon: 'edit' });
const deleteEntityButton = Button({ icon: 'trash' });
const newButton = Button('+ New');


const defaults = {
  defaultPrefix: {
    name: `TP${FinanceHelper.getRandomPrefixSuffix()}`,
    description: 'Automation_Test_Prefix',
  },

  defaultSuffix: {
    name: `TS${FinanceHelper.getRandomPrefixSuffix()}`,
    description: 'Automation_Test_Suffix',
  },
};

const UI = {
  waitLoadingPrefixes() {
    cy.expect(Pane('Prefixes').exists());
    cy.wait(1000);
  },

  waitLoadingSuffixes() {
    cy.expect(Pane('Suffixes').exists());
    cy.wait(1000);
  },

  createNewPrefix(name, desc) {
    cy.do(newButton.click());
    cy.wait(1000);
    cy.do(nameField.fillIn(name));
    cy.do(descriptionField.fillIn(desc));
    cy.wait(1000);
    cy.do(saveButton.click());
  },

  createNewSuffix(name, desc) {
    cy.do(newButton.click());
    cy.wait(1000);
    cy.do(nameField.fillIn(name));
    cy.do(descriptionField.fillIn(desc));
    cy.wait(1000);
    cy.do(saveButton.click());
  },

  checkPrefixExists(name) {
    cy.expect(MultiColumnListCell(name).exists());
  },

  checkSuffixExists(name) {
    cy.expect(MultiColumnListCell(name).exists());
  },

  editPrefix(oldName, newName, newDesc) {
    cy.do(MultiColumnListRow({ content: including(oldName), isContainer: true }).find(editEntityButton).click());
    cy.wait(1000);
    cy.do(nameField.fillIn(newName));
    cy.do(descriptionField.fillIn(newDesc));
    cy.wait(1000);
    cy.do(saveButton.click());
  },

  editSuffix(oldName, newName, newDesc) {
    cy.do(MultiColumnListRow({ content: including(oldName), isContainer: true }).find(editEntityButton).click());
    cy.wait(1000);
    cy.do(nameField.fillIn(newName));
    cy.do(descriptionField.fillIn(newDesc));
    cy.wait(1000);
    cy.do(saveButton.click());
  },

  deletePrefix(name) {
    cy.do(MultiColumnListRow({ content: including(name), isContainer: true }).find(deleteEntityButton).click());
  },

  deleteSuffix(name) {
    cy.do(MultiColumnListRow({ content: including(name), isContainer: true }).find(deleteEntityButton).click());
  },

  checkCannotDeletePrefixModal() {
    cy.expect(cannotDeletePrefixModal.exists());
    cy.expect(cannotDeletePrefixModal.find(HTML('This prefix cannot be deleted, as it is in use by one or more records.')).exists());
    cy.expect(cannotDeletePrefixModal.find(buttonOkay).exists());
  },

  checkCannotDeleteSuffixModal() {
    cy.expect(cannotDeleteSuffixModal.exists());
    cy.expect(cannotDeleteSuffixModal.find(HTML('This suffix cannot be deleted, as it is in use by one or more records.')).exists());
    cy.expect(cannotDeleteSuffixModal.find(buttonOkay).exists());
  },

  closeCannotDeletePrefixModal() {
    cy.do(cannotDeletePrefixModal.find(buttonOkay).click());
  },

  closeCannotDeleteSuffixModal() {
    cy.do(cannotDeleteSuffixModal.find(buttonOkay).click());
  },

  checkDeletePrefixConfirmationModal(name) {
    cy.expect(deletePrefixModal.exists());
    cy.expect(deletePrefixModal.find(HTML(`The prefix ${name} will be deleted.`)).exists());
  },

  checkDeleteSuffixConfirmationModal(name) {
    cy.expect(deleteSuffixModal.exists());
    cy.expect(deleteSuffixModal.find(HTML(`The suffix ${name} will be deleted.`)).exists());
  },

  confirmDeletePrefix() {
    cy.do(deletePrefixModal.find(deleteButton).click());
  },

  confirmDeleteSuffix() {
    cy.do(deleteSuffixModal.find(deleteButton).click());
  },

  checkPrefixNotExists(name) {
    cy.expect(MultiColumnListCell(name).absent());
  },

  checkSuffixNotExists(name) {
    cy.expect(MultiColumnListCell(name).absent());
  },
};

const API = {
  getPrefixesViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'orders/configuration/prefixes',
    });
  },

  deletePrefixViaApi(id) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `orders/prefixes/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false
    });
  },

  deletePrefixByNameViaApi(name) {
    this.getPrefixesViaApi().then(response => {
      const prefix = response.body.prefixes.find(p => p.name === name);
      if (prefix) {
        this.deletePrefixViaApi(prefix.id);
      }
    });
  },

  getSuffixesViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'orders/configuration/suffixes',
    });
  },

  deleteSuffixViaApi(id) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `orders/suffixes/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false
    });
  },

  deleteSuffixByNameViaApi(name) {
    this.getSuffixesViaApi().then(response => {
      const suffix = response.body.suffixes.find(s => s.name === name);
      if (suffix) {
        this.deleteSuffixViaApi(suffix.id);
      }
    });
  }
};

export const PrefixSuffix = {
  ...defaults,
  ...UI,
  ...API,
};
