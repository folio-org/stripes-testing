import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C404371 autotest mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C404371 autotest action profile ${getRandomPostfix()}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };
    const calloutMessage = `Mapping profile '${mappingProfile.name}' can not be linked to this Action profile. ExistingRecordType and FolioRecord types are different`;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });

        // create field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C404371 Verify the error message after attempting to link action and field mapping profiles with different record type (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        NewActionProfile.verifyPreviouslyPopulatedDataIsDisplayed(actionProfile);
        ActionProfileView.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
