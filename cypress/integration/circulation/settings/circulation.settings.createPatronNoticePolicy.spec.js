import { TextField, Button, TextArea } from '../../../../interactors';
import TopMenu from '../../../support/fragments/topMenu';
import TestType from '../../../support/dictionary/testTypes';
import SettingsCirculations from '../../../support/fragments/circulation/settingsCirculations';
import NewPatronNoticePolicies from '../../../support/fragments/circulation/newPatronNoticePolicies';

describe('ui-circulation-settings: create patron notice policies', () => {
  const patronNoticePolicy = { ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${TopMenu.settingsCirculation}${SettingsCirculations.settingsCirculationPath.patronNoticePolicies}`);
  });
  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    SettingsCirculations.createNewPatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.checkPatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.duplicatePatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.deletePatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.editPatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.checkPatronNoticePolicies(patronNoticePolicy);
    SettingsCirculations.deletePatronNoticePolicies(patronNoticePolicy);
  });
});
