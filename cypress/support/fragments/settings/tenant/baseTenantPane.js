import uuid from 'uuid';
import SettingsPane, { rootPane } from '../settingsPane';
import { Select, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

export const getDefaultTenant = (props = {}) => ({
  code: `autotest_code_${getRandomPostfix()}`,
  id: uuid(),
  name: `autotest_name_${getRandomPostfix()}`,
  ...props,
});

export default {
  ...SettingsPane,
  rootPane,
  checkNoActionButtons() {
    SettingsPane.checkAddNewBtnAbsent();
    SettingsPane.checkColumnAbsent('Actions');
  },
  selectOptions(options = []) {
    options.forEach(({ label, option }) => {
      this.selectOption(label, option);
    });
  },
  selectOption(label, option) {
    cy.do(Select(label).choose(including(option.name)));
    this.checkOptionSelected(label, option);
  },
  checkOptionSelected(label, option) {
    cy.expect(Select(label).has({ value: option.id }));
  },
};
