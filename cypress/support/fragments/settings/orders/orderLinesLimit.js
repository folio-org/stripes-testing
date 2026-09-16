import { Button, Pane, TextField } from '../../../../../interactors';
import OrderStorageSettings from '../../orders/orderStorageSettings';

const SETTING_KEY = 'poLines-limit';

export default {
  getPOLLimit() {
    return OrderStorageSettings.getSettingsViaApi({ key: SETTING_KEY });
  },

  createPOLLimit({ value }) {
    const payload = {
      key: SETTING_KEY,
      value: String(value),
    };

    return OrderStorageSettings.createSettingViaApi(payload);
  },

  updatePOLLimit(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  deletePOLLimit(setting) {
    return OrderStorageSettings.deleteSettingViaApi(setting);
  },

  setPOLLimitViaApi(limit) {
    const value = String(limit);
    return this.getPOLLimit().then((settings) => {
      if (settings.length) {
        const current = settings[0];
        return this.updatePOLLimit({ ...current, value });
      }

      return this.createPOLLimit({ value });
    });
  },

  setPOLLimit(value) {
    const limit = String(value);
    cy.do(
      Pane('Purchase order lines limit')
        .find(TextField('Set purchase order lines limit'))
        .fillIn(limit),
    );
    cy.do(Button('Save').click());
    cy.wait(2000);
  },
};
