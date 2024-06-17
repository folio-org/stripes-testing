import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ConfirmRemoval from '../../../support/fragments/data_import/action_profiles/modals/confirmRemoval';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C422253 Testing linking for job profile${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C422253 Testing linking for job profile${getRandomPostfix()}`,
    };
    const jobProfileName = `C422253 job profile${getRandomPostfix()}`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewJobProfile.createJobProfileWithoutLinkedProfilesViaApi(jobProfileName);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C422253 No error appears after linking the action profile with multiple linking/unlinking field mapping profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        ActionProfileView.waitLoading();
        ActionProfileView.edit();
        ActionProfileEdit.verifyScreenName(actionProfile.name);
        ActionProfileEdit.unlinkFieldMappingProfile();
        ConfirmRemoval.confirmRemovefieldMappingProfile();
        ActionProfileEdit.save();
        ActionProfileView.verifyLinkedFieldMappingProfileAbsent(mappingProfile.name);

        ActionProfileView.waitLoading();
        ActionProfileView.edit();
        ActionProfileEdit.verifyScreenName(actionProfile.name);
        ActionProfileEdit.linkMappingProfile(mappingProfile.name);
        ActionProfileView.verifyLinkedFieldMappingProfile(mappingProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.search(jobProfileName);
        JobProfileView.edit();
        JobProfileEdit.linkActionProfileByName(actionProfile.name);
        JobProfileEdit.saveAndClose();
      },
    );
  });
});
