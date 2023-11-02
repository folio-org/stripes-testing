import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C2351 autotest mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const instanceStatusTerm = '"Batch Loaded"';

    before('create test data', () => {
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
        InteractorsTools.closeCalloutMessage();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C2351 Edit an existing field mapping profile (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);
        FieldMappingProfileEdit.fillInstanceStatusTerm(instanceStatusTerm);
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.checkCalloutMessage(mappingProfile.name);
        FieldMappingProfileView.verifyInstanceStatusTerm(instanceStatusTerm);
      },
    );
  });
});
