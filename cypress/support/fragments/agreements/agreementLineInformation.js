import { Keyboard } from '@interactors/keyboard';
import { Button, KeyValue, Section, Pane, MultiSelect, Badge } from '../../../../interactors';

const rootSection = Section({ id: 'pane-view-agreement-line' });
const tagsButton = Button({ id: 'clickable-show-tags' });
const tagsPane = Pane('Tags');
const addTagsField = MultiSelect({ label: 'Tag text area' });

export default {
  waitLoadingWithExistingLine(title) {
    cy.expect(rootSection.find(KeyValue({ value: title })).exists());
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
};
