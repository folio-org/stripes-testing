import { Pane, Button, Select, Checkbox, NavListItem } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const SaveButton = Button('Save');
const TLRCheckbox = Checkbox({ name: 'titleLevelRequestsFeatureEnabled' });
const ConfirmationNotice= Select({name: "confirmationPatronNoticeTemplateId"});
const CancellationNotice =Select({name:'cancellationPatronNoticeTemplateId'});
const ExpirationNotice = Select({name:'expirationPatronNoticeTemplateId'});

export default {
  waitLoading() {
    cy.expect(Pane('Title level requests').exists());
  },

  checkCirculationHasTLR() {
    cy.expect(Pane({ id: 'app-settings-nav-pane' }).find(NavListItem('Title level requests')).exists());
  },
  SelectConfirmationNoticeDropdown: (notice) => {

    cy.do(ConfirmationNotice.choose(notice.notice1));

  },

  SelectCancelleationNoticeDropdown: (notice) => {

    cy.do(CancellationNotice.choose(notice.notice2));

  },

  SelectExpirationNoticeDropdown: (notice) => {

    cy.do(ExpirationNotice.choose(notice.notice3))

   

  },

  clickOnSaveButton:()=>{

    cy.do(SaveButton.click());

  },

  changeTitleLevelRequestsStatus(status) {
    cy.get('input[name="titleLevelRequestsFeatureEnabled"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (!checked && status === 'allow') {
          cy.expect(Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists());
          cy.do(TLRCheckbox.click());
          cy.do(SaveButton.click());
          this.checkUpdateTLRCalloutAppeared();
        } else if (checked && status === 'forbid') {
          cy.expect(Checkbox({ name: 'titleLevelRequestsFeatureEnabled', disabled: false }).exists());
          cy.do(TLRCheckbox.click());
          // need to wait if the popup module appears
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(7000);
          cy.get('#OverlayContainer').then((body) => {
            if (body.find('div[label*="Cannot change"]').length) {
              cy.do(Button('Close').click());
            } else {
              cy.do(SaveButton.click());
              this.checkUpdateTLRCalloutAppeared();
            }
          });
        }
      });
  },

  checkUpdateTLRCalloutAppeared() {
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
  },
};
