import { Button, Checkbox, Heading } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const SaveButton = Button('Save');
const enableTagsCheckbox = Checkbox({ name: 'tags_enabled' });

export default {
  waitLoading() {
    cy.expect(Heading('General').exists());
  },

  checkEnableTagsNotAvailable() {
    cy.expect(Checkbox({ id: 'tags_enabled', disabled: true }).exists());
  },

  changeEnableTagsStatus(status) {
    cy.get('input[id="tags_enabled"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (!checked && status === 'enable') {
          cy.expect(Checkbox({ id: 'tags_enabled', disabled: false }).exists());
          cy.do(enableTagsCheckbox.click());
          cy.do(SaveButton.click());
          this.checkUpdateTLRCalloutAppeared();
        } else if (checked && status === 'disable') {
          cy.expect(Checkbox({ id: 'tags_enabled', disabled: false }).exists());
          cy.do(enableTagsCheckbox.click());
          cy.do(SaveButton.click());
          this.checkUpdateTLRCalloutAppeared();
        }
      });
  },

  checkUpdateTLRCalloutAppeared() {
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },
};
