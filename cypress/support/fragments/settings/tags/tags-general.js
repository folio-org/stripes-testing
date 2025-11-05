import { Button, Checkbox, Heading } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const successCalloutMessage = 'Setting was successfully updated.';
const saveButton = Button('Save');
const enableTagsCheckbox = Checkbox({ name: 'tags_enabled' });

export default {
  waitLoading() {
    cy.expect(Heading('General').exists());
  },

  checkEnableTagsNotAvailable() {
    cy.expect(Checkbox({ id: 'tags_enabled', disabled: true }).exists());
  },

  changeEnableTagsStatus(status) {
    cy.wait(1000);
    cy.get('input[name="tags_enabled"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if ((!checked && status === 'enable') || (checked && status === 'disable')) {
          cy.intercept({ method: /POST|PUT/, url: /\/configurations\/entries(\/.+)?$/ }).as(
            'saveTagsSettings',
          );
        }

        if (!checked && status === 'enable') {
          cy.expect(Checkbox({ name: 'tags_enabled', disabled: false }).exists());
          cy.do(enableTagsCheckbox.click());
          cy.wait(1000);
          cy.do(saveButton.click());
          InteractorsTools.checkCalloutMessage(successCalloutMessage);
          cy.wait('@saveTagsSettings');
        } else if (checked && status === 'disable') {
          cy.expect(Checkbox({ name: 'tags_enabled', disabled: false }).exists());
          cy.do(enableTagsCheckbox.click());
          cy.wait(1000);
          cy.do(saveButton.click());
          InteractorsTools.checkCalloutMessage(successCalloutMessage);
          cy.wait('@saveTagsSettings');
        }
      });
  },
};
