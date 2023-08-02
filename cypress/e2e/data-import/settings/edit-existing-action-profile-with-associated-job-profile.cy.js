import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { FOLIO_RECORD_TYPE, ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ConfirmChanges from '../../../support/fragments/data_import/action_profiles/modals/confirmChanges';

describe('ui-data-import', () => {
  let user;
  const mappingProfile = {
    name: `C367994 autotest mapping profile ${getRandomPostfix}`,
    typeValue: FOLIO_RECORD_TYPE.INSTANCE
  };
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    name: `C367994 autotest action profile ${getRandomPostfix}`
  };
  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: `C367994 autotest job profile${getRandomPostfix}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC };

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
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
  });

  it('C367994 Edit an existing action profile with associated job profile (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.search(actionProfile.name);
    ActionProfiles.verifyActionProfileOpened(actionProfile.name);
    ActionProfileView.edit();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changeAction();
    ActionProfileEdit.save();
    ConfirmChanges.cancelChanges();
    ActionProfileEdit.verifyScreenName(actionProfile.name);
    ActionProfileEdit.changesNotSaved();
    ActionProfileEdit.save();
    ConfirmChanges.confirmChanges();
    ActionProfiles.checkListOfExistingProfilesIsDisplayed();
    ActionProfiles.checkCalloutMessage(actionProfile.name);
    ActionProfileView.verifyAction();
  });
});
