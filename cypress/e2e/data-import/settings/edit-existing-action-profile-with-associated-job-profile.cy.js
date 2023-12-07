import { ACCEPTED_DATA_TYPE_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ConfirmChanges from '../../../support/fragments/data_import/action_profiles/modals/confirmChanges';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C367994 autotest mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C367994 autotest action profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C367994 autotest job profile${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully updated`;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });

        // create Field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();

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
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      });
    });

    it(
      'C367994 Edit an existing action profile with associated job profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
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
        ActionProfiles.checkCalloutMessage(calloutMessage);
        ActionProfileView.verifyAction();
      },
    );
  });
});
