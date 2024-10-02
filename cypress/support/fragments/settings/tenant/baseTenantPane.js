import uuid from 'uuid';
import SettingsPane, { rootPane } from '../settingsPane';
import { Select, NavListItem, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

export const getDefaultTenant = ({ id, name, code, ...props } = {}) => ({
  id: id || uuid(),
  name: name || `autotest_name_${getRandomPostfix()}`,
  code: code || `autotest_code_${getRandomPostfix()}`,
  ...props,
});

export default {
  ...SettingsPane,
  rootPane,
  openLibrariesTabFromSettingsList() {
    cy.do(NavListItem('Tenant').click());
    cy.do(NavListItem('Libraries').click());
  },
  openCampusesTabFromSettingsList() {
    cy.do(NavListItem('Tenant').click());
    cy.do(NavListItem('Campuses').click());
  },
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
    cy.wait(2000);
    cy.do(Select(label).choose(including(option.name)));
    this.checkOptionSelected(label, option);
  },
  checkOptionSelected(label, option) {
    cy.expect(Select(label).has({ value: option.id }));
  },
};
