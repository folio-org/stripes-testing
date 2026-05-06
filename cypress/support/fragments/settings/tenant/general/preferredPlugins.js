import { including } from '@interactors/html';

import { Button, Pane, Select } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const rootPane = Pane('Preferred plugins');
const saveButton = Button('Save');
const pluginSelect = (pluginType) => rootPane.find(Select({ id: pluginType }));

export default {
  waitLoading() {
    cy.expect(rootPane.exists());
  },
  verifyPaneContent() {
    cy.expect([rootPane.exists(), saveButton.exists()]);
  },
  verifyPluginSelectExists(pluginType) {
    cy.expect(pluginSelect(pluginType).exists());
  },
  selectPluginVersion(pluginType, optionName) {
    cy.get(`select#${pluginType}`).select(optionName);
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
