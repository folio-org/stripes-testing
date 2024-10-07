import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ConfirmRemoval from '../../../support/fragments/data_import/action_profiles/modals/confirmRemoval';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const mappingProfile = {
      name: `C11115 autotest mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      name: `C11115 autotest action profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    before('Login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C11115 Attach/Remove a field mapping profile to an action profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        ActionProfileView.verifyLinkedFieldMappingProfile(mappingProfile.name);
        ActionProfileView.openFieldMappingProfileView();
        FieldMappingProfileView.verifyLinkedActionProfile(actionProfile.name);
        FieldMappingProfileView.openAssociatedActionProfile();
        ActionProfiles.verifyActionProfileOpened();

        ActionProfileView.edit();
        ActionProfileEdit.unlinkFieldMappingProfile();
        ConfirmRemoval.cancelRemoveFieldMappingProfile();
        ActionProfileEdit.fieldMappingProfilePresented(mappingProfile.name);
        ActionProfileEdit.unlinkFieldMappingProfile();
        ConfirmRemoval.confirmRemovefieldMappingProfile();
        ActionProfileEdit.fieldMappingProfileAbsent();
        ActionProfileEdit.save();
        ActionProfileView.verifyLinkedFieldMappingProfileAbsent(mappingProfile.name);
      },
    );
  });
});
