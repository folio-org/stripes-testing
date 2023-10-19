import { Pane, Button, Select, Checkbox, NavListItem, Modal } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const saveButton = Button('Save');
const TLRCheckbox = Checkbox({ name: 'titleLevelRequestsFeatureEnabled' });
const confirmationNotice = Select({ name: 'confirmationPatronNoticeTemplateId' });
const cancellationNotice = Select({ name: 'cancellationPatronNoticeTemplateId' });
const expirationNotice = Select({ name: 'expirationPatronNoticeTemplateId' });

export default {
  TLRCheckbox,
  waitLoading() {
    cy.expect(Pane('Title level requests').exists());
  },

  checkCirculationHasTLR() {
    cy.expect(
      Pane({ id: 'app-settings-nav-pane' }).find(NavListItem('Title level requests')).exists(),
    );
  },
  selectConfirmationNoticeDropdown: (notice) => {
    cy.do(confirmationNotice.choose(notice.notice1));
  },

  selectCancelleationNoticeDropdown: (notice) => {
    cy.do(cancellationNotice.choose(notice.notice2));
  },

  selectExpirationNoticeDropdown: (notice) => {
    cy.do(expirationNotice.choose(notice.notice3));
  },

  clickOnSaveButton: () => {
    cy.do(saveButton.click());
  },

  clickOnTLRCheckbox: () => {
    cy.do(TLRCheckbox.click());
  },

  changeTitleLevelRequestsStatus(status) {
    cy.wait(2000);
    cy.get('input[name="titleLevelRequestsFeatureEnabled"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (!checked && status === 'allow') {
          cy.expect(
            Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists(),
          );
          cy.do(TLRCheckbox.click());
          cy.do(saveButton.click());
          this.checkUpdateTLRCalloutAppeared();
        } else if (checked && status === 'allow') {
          // If checkbox is already checked - to prevent test failing during parallel run
          cy.log('TLR checkbox is already checked');
        } else if (checked && status === 'forbid') {
          cy.expect(
            Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists(),
          );
          cy.do(TLRCheckbox.click());
          // need to wait if the popup module appears
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(7000);
          cy.get('#OverlayContainer').then((body) => {
            if (body.find('div[label*="Cannot change"]').length) {
              cy.do(Button('Close').click());
            } else {
              cy.do(saveButton.click());
              this.checkUpdateTLRCalloutAppeared();
            }
          });
        }
      });
  },

  checkUpdateTLRCalloutAppeared() {
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },

  checkCannotChangeTLRModal() {
    cy.expect(
      Modal('Cannot change "Allow title level requests"').has({
        message:
          '"Allow title level requests" cannot be changed because it is in use by one or more requests',
      }),
    );
  },
};
