import { including } from '@interactors/html';

import { Button, Pane, Select } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const PLUGIN_SCOPE = 'ui-tenant-settings.plugins.manage';
const rootPane = Pane('Preferred plugins');
const saveButton = Button('Save');
const pluginSelect = (pluginType) => rootPane.find(Select({ id: pluginType }));

export default {
  waitLoading() {
    cy.expect(rootPane.exists());
  },
  verifyPaneContent() {
    cy.expect([rootPane.exists(), saveButton.has({ disabled: true })]);
  },
  verifyReadOnlyPaneContent() {
    cy.expect([rootPane.exists(), saveButton.absent()]);
  },
  verifyPluginSelectExists(pluginType) {
    cy.expect(pluginSelect(pluginType).exists());
  },
  verifyPluginLabelHasLockIcon(pluginType) {
    cy.get(`label#${pluginType}-label [class*="icon-lock"]`).should('exist');
  },
  verifyPluginSelectIsReadOnly(pluginType) {
    cy.get(`select#${pluginType}`).then(($select) => {
      const currentValue = $select.val();
      $select.find('option').each((_, opt) => {
        if (opt.value === currentValue && currentValue !== '') {
          expect(opt.disabled, `option "${opt.value}" should be enabled`).to.equal(false);
        } else {
          expect(opt.disabled, `option "${opt.value}" should be disabled`).to.equal(true);
        }
      });
    });
  },
  selectPluginVersion(pluginType, optionName) {
    cy.do(pluginSelect(pluginType).choose(optionName));
  },
  resetPluginToDefaultViaApi(pluginType) {
    cy.getConfigForTenantByName(pluginType, PLUGIN_SCOPE).then((config) => {
      if (config) {
        cy.updateConfigForTenantById(config.id, {
          id: config.id,
          scope: PLUGIN_SCOPE,
          key: pluginType,
          value: null,
        });
      }
    });
  },
  verifySelectedPluginVersion(pluginType, optionName) {
    cy.expect(pluginSelect(pluginType).has({ checkedOptionText: including(optionName) }));
  },
  verifySaveButtonEnabled(enabled = true) {
    cy.expect(saveButton.has({ disabled: !enabled }));
  },
  clickSaveButton() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage('Settings were successfully updated.');
    cy.wait(1000);
  },
};
