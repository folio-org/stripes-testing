import uuid from 'uuid';
import { Button, Checkbox, Modal, NavListItem, Pane, Select } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const saveButton = Button('Save');
const TLRCheckbox = Checkbox({ name: 'titleLevelRequestsFeatureEnabled' });
const titleLevelHoldCirculationRulesCheckbox = Checkbox({
  name: 'tlrHoldShouldFollowCirculationRules',
});
const confirmationNotice = Select({ name: 'confirmationPatronNoticeTemplateId' });
const cancellationNotice = Select({ name: 'cancellationPatronNoticeTemplateId' });
const expirationNotice = Select({ name: 'expirationPatronNoticeTemplateId' });

export default {
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

  uncheckFailToCreateHoldForBlockedRequestCheckBox() {
    cy.do(titleLevelHoldCirculationRulesCheckbox.uncheckIfSelected());
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

  enableTLRViaApi() {
    if (Cypress.env('newSettings')) {
      this.updateGeneralTlrSettingViaApi({ titleLevelRequestsFeatureEnabled: true });
    } else {
      this.updateTlrConfigViaApi({ titleLevelRequestsFeatureEnabled: true });
    }
    cy.wait(3000);
  },

  disableTLRViaApi() {
    if (Cypress.env('newSettings')) {
      this.updateGeneralTlrSettingViaApi({ titleLevelRequestsFeatureEnabled: false });
    } else {
      this.updateTlrConfigViaApi({ titleLevelRequestsFeatureEnabled: false });
    }
    cy.wait(3000);
  },

  updateTlrConfigViaApi(newSettings) {
    cy.getConfigByName('SETTINGS', 'TLR').then((body) => {
      let config = body.configs[0];

      if (body.configs.length === 0) {
        cy.wrap(true).then(() => {
          config = {
            value:
              '{"titleLevelRequestsFeatureEnabled":true,"createTitleLevelRequestsByDefault":false,"tlrHoldShouldFollowCirculationRules":false,"confirmationPatronNoticeTemplateId":null,"cancellationPatronNoticeTemplateId":null,"expirationPatronNoticeTemplateId":null}',
            module: 'SETTINGS',
            configName: 'TLR',
            id: uuid(),
          };
        }).then(() => {
          const newValue = { ...JSON.parse(config.value), ...newSettings };
          config.value = JSON.stringify(newValue);

          cy.okapiRequest({
            method: 'POST',
            path: 'configurations/entries',
            isDefaultSearchParamsRequired: false,
            failOnStatusCode: false,
            body: config,
          });
        });
      } else {
        const newValue = { ...JSON.parse(config.value), ...newSettings };
        config.value = JSON.stringify(newValue);

        cy.okapiRequest({
          method: 'PUT',
          path: `configurations/entries/${config.id}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: {
            id: config.id,
            module: config.module,
            configName: config.configName,
            enabled: true,
            value: config.value,
          },
        });
      }
    });
  },

  updateGeneralTlrSettingViaApi(newSettings) {
    cy.getSettingsByName('circulation', 'generalTlr').then((body) => {
      let config = body.items[0];

      if (body.items.length === 0) {
        cy.wrap(true).then(() => {
          config = {
            value: {
              titleLevelRequestsFeatureEnabled: true,
              createTitleLevelRequestsByDefault: false,
              tlrHoldShouldFollowCirculationRules: false,
            },
            scope: 'circulation',
            key: 'generalTlr',
            id: uuid(),
          };
        }).then(() => {
          config.value = { ...config.value, ...newSettings };

          cy.okapiRequest({
            method: 'POST',
            path: 'settings/entries',
            isDefaultSearchParamsRequired: false,
            failOnStatusCode: false,
            body: config,
          });
        });
      } else {
        config.value = { ...config.value, ...newSettings };

        cy.okapiRequest({
          method: 'PUT',
          path: `settings/entries/${config.id}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      }
    });
  },
};
