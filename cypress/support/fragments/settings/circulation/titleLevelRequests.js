import { Pane, Button, Checkbox } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const SaveButton = Button('Save');
const TLRCheckbox = Checkbox({ name: 'titleLevelRequestsFeatureEnabled' });

export default {
  waitLoading() {
    cy.expect(Pane('Title level requests').exists());
  },

  changeTitleLevelRequestsStatus(status) {
    cy.get('input[name="titleLevelRequestsFeatureEnabled"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (!checked && status === 'allow') {
          cy.expect(Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists());
          cy.do([TLRCheckbox.click(), SaveButton.click()]);
          this.checkUpdateTLRCalloutAppeared();
        } else if (checked && status === 'forbid') {
          cy.expect(Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists());
          cy.do([TLRCheckbox.click(), SaveButton.click()]);
          this.checkUpdateTLRCalloutAppeared();
        }
      });
  },

  checkUpdateTLRCalloutAppeared() {
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },
};
