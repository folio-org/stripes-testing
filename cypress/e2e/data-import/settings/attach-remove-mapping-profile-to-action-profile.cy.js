import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ConfirmRemoval from '../../../support/fragments/data_import/action_profiles/modals/confirmRemoval';

describe('data-import', () => {
  describe('Settings', () => {
    const mappingProfile = {
      name: `C11115 autotest mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      name: `C11115 autotest action profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    before('login', () => {
      cy.loginAsAdmin();
      cy.getAdminToken();
    });

    after('delete test data', () => {
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C11115 Attach/Remove a field mapping profile to an action profile (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
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
