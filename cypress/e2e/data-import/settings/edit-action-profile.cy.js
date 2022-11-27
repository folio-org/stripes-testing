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

describe('ui-data-import: edit profile', () => {
  const actionProfileName = `C2348 autotest action profile ${Helper.getRandomBarcode()}`;
  let user;
  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName
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
        ActionProfiles.checkActionProfilePresented(actionProfile.name);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    ActionProfiles.deleteActionProfile(actionProfileName);
  });

  it('C2348 Edit an existing action profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // step 1 checks
    ActionProfiles.search(actionProfile.name);
    ActionProfiles.selectActionProfileFromList(actionProfile.name);
    ActionProfiles.verifyActionProfileOpened(actionProfile.name);
    ActionProfileView.edit();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changeAction();
    ActionProfileEdit.save();
    ActionProfiles.checkCalloutMessage(actionProfile.name);
    ActionProfileView.verifyAction();
    // step 5 need to create test with linking action profile with job profile
  });
});
