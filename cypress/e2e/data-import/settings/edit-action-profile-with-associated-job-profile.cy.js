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
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';

describe('ui-data-import: Edit an existing action profile with associated job profile', () => {
  const actionProfileName = `C367994 autotest action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C367994 autotest job profile${Helper.getRandomBarcode()}`;
  let user;
  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName
  };
  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  before('create user', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.actionProfilePath, waiter: ActionProfiles.waitLoading });

        // create Action profile
        ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
        InteractorsTools.closeCalloutMessage();
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfileName);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileName);
      });
  });

  //   after('delete test data', () => {
  //     Users.deleteViaApi(user.userId);
  //     ActionProfiles.deleteActionProfile(actionProfileName);
  //   });

  it('C367994 Edit an existing action profile with associated job profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.search(actionProfile.name);
    ActionProfiles.selectActionProfileFromList(actionProfile.name);
    ActionProfiles.verifyActionProfileOpened(actionProfile.name);
    ActionProfileView.edit();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changeAction();
    ActionProfileEdit.save();
    // ActionProfiles.checkCalloutMessage(actionProfile.name);
    // ActionProfileView.verifyAction();
  });
});
