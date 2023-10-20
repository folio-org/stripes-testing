import { Keyboard } from '@interactors/keyboard';
import { Button, KeyValue, Section, Pane, MultiSelect, Badge } from '../../../../interactors';
import AgreementViewDetails from './agreementViewDetails';

const rootSection = Section({ id: 'pane-view-agreement-line' });
const tagsButton = Button({ id: 'clickable-show-tags' });
const tagsPane = Pane('Tags');
const addTagsField = MultiSelect({ label: 'Tag text area' });
const closeButton = rootSection.find(Button({ icon: 'times' }));
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');

export default {
  waitLoadingWithExistingLine(title) {
    cy.expect([rootSection.find(KeyValue({ value: title })).exists(), actionsButton.exists()]);
  },

  openTagsPane() {
    cy.do([rootSection.find(tagsButton).click()]);
    cy.expect(tagsPane.exists());
  },

  closeTagsPane() {
    cy.do([tagsPane.dismiss()]);
    cy.expect(tagsPane.absent());
  },

  addTag(tag) {
    cy.do([
      tagsPane.find(addTagsField).focus(),
      Keyboard.type(tag),
      Keyboard.press({ code: 'Enter' }),
    ]);
    // need to wait for changes to be applied
    cy.wait(500);
  },

  verifyTagsCount(itemCount) {
    cy.expect(tagsButton.find(Badge()).has({ text: itemCount }));
  },

  verifyDescription(description) {
    cy.expect(rootSection.find(KeyValue('Description')).has({ value: description }));
  },

  close() {
    cy.do(closeButton.click());
    cy.expect(rootSection.absent());
    AgreementViewDetails.waitLoading();
  },

  verifyActionsButtons() {
    cy.do(actionsButton.click());
    cy.expect([editButton.exists(), deleteButton.exists()]);
    cy.do(actionsButton.click());
  },

  gotoDelete() {
    cy.do(actionsButton.click());
    cy.expect(deleteButton.exists());
    cy.do(deleteButton.click());
  },
};
