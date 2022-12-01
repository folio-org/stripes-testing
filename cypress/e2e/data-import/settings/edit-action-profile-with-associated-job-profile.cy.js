import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import Users from '../../../support/fragments/users/users';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ConfirmChanges from '../../../support/fragments/data_import/action_profiles/modals/confirmChanges';

describe('ui-data-import: Edit an existing action profile with associated job profile', () => {
  const mappingProfileName = `C367994 autotest mapping profile ${Helper.getRandomBarcode()}`;
  const actionProfileName = `C367994 autotest action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C367994 autotest job profile${Helper.getRandomBarcode()}`;
  let user;
  const mappingProfile = {
    name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance
  };
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
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });

        // create Field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        FieldMappingProfiles.saveProfile();

        // create Action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileName);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });

  it('C367994 Edit an existing action profile with associated job profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.search(actionProfile.name);
    ActionProfiles.verifyActionProfileOpened(actionProfile.name);
    ActionProfileView.edit();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changeAction();
    ActionProfileEdit.save();
    ConfirmChanges.confirmChanges();
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.checkCalloutMessage(actionProfile.name);
    ActionProfileView.verifyAction();
  });
});
