import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';

describe('ui-data-import', () => {
  let user;
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    name: `C2348 autotest action profile ${getRandomPostfix}`
  };

  before('create user', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.actionProfilePath, waiter: ActionProfiles.waitLoading });

        ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
        InteractorsTools.closeCalloutMessage();
        ActionProfileView.closeViewModeForMatchProfile();
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    ActionProfiles.deleteActionProfile(actionProfile.name);
  });

  it('C2348 Edit an existing action profile without associated job profile (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.search(actionProfile.name);
    ActionProfiles.verifyActionProfileOpened(actionProfile.name);
    ActionProfileView.edit();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changeAction();
    ActionProfileEdit.save();
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.checkCalloutMessage(actionProfile.name);
    ActionProfileView.verifyAction();
  });
});
