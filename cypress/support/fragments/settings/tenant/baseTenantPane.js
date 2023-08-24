import uuid from 'uuid';
import SettingsPane from '../settingsPane';
import { Select, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

export const getDefaultTenant = (props) => ({
  code: `autotest_code_${getRandomPostfix()}`,
  id: uuid(),
  name: `autotest_name_${getRandomPostfix()}`,
  ...props,
});

export default {
  ...SettingsPane,
  viewTable() {
    // should be overriden in child modules
  },
  checkNoActionButtons() {
    SettingsPane.checkAddNewBtnAbsent();
    SettingsPane.checkColumnAbsent('Actions');
  },
  selectOption(label, option) {
    cy.do(Select(label).choose(including(option)));
  },
};
