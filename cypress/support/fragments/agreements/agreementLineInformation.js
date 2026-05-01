import {
  Button,
  KeyValue,
  Pane,
  PaneHeader,
  MultiSelect,
  Badge,
  ValueChipRoot,
  MultiSelectMenu,
  MultiSelectOption,
  including,
} from '../../../../interactors';
import AgreementViewDetails from './agreementViewDetails';

const rootSection = Pane({ id: 'pane-view-agreement-line' });
const tagsButton = Button({ id: 'clickable-show-tags' });
const tagsPane = Pane('Tags');
const closeIcon = Button({ icon: 'times' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const tagsMultiSelect = MultiSelect({ id: 'input-tag' });

export default {
  waitLoadingWithExistingLine(title) {
    cy.expect([rootSection.find(KeyValue({ value: title })).exists(), actionsButton.exists()]);
  },

  openTagsPane() {
    cy.do([rootSection.find(tagsButton).click()]);
    cy.expect(tagsPane.exists());
  },

  closeTagsPane() {
    cy.do(tagsPane.find(PaneHeader()).find(closeIcon).click());
    cy.expect(tagsPane.absent());
  },

  addTag(tagName) {
    cy.do([tagsMultiSelect.open(), tagsMultiSelect.filter(tagName)]);
    cy.wait(500);
    cy.do(tagsMultiSelect.open());
    cy.expect(MultiSelectMenu({ visible: true }).exists());
    cy.do(MultiSelectMenu().find(MultiSelectOption(tagName)).click());
  },

  addNewTag: (tagName) => {
    cy.do([tagsMultiSelect.open(), tagsMultiSelect.filter(tagName)]);
    cy.wait(500);
    cy.do(tagsMultiSelect.open());
    cy.expect(MultiSelectMenu({ visible: true }).exists());
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including('Add tag for:')))
        .click(),
    );
  },

  verifyTagAdded: (tag) => {
    cy.expect(tagsPane.find(ValueChipRoot(tag)).exists());
  },

  verifyTagsCount(itemCount) {
    cy.expect(tagsButton.find(Badge()).has({ text: itemCount }));
  },

  verifyDescription(description) {
    cy.expect(rootSection.find(KeyValue('Description')).has({ value: description }));
  },

  close() {
    cy.do(rootSection.find(closeIcon).click());
    cy.expect(rootSection.absent());
    AgreementViewDetails.waitLoading();
  },

  verifyActionsButtons() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect([editButton.exists(), deleteButton.exists()]);
    cy.do(rootSection.find(actionsButton).click());
  },

  gotoDelete() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(deleteButton.exists());
    cy.do(deleteButton.click());
  },
};
