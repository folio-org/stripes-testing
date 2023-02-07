import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';

describe('ui-data-import:', () => {
  let user;

  before('create user', () => {
    cy.createTempUser([
      permissions.settingsDataImportView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: SettingsMenu.actionProfilePath, waiter: ActionProfiles.waitLoading });
      });
  });

  it('C356780 A user can view logs but can not import files with "Data import: Can view only" permission (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {

  });
});
