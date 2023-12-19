import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

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
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      });
    });

    it(
      'C2351 Edit an existing field mapping profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        const calloutMessage = `The field mapping profile "${mappingProfile.name}" was successfully updated`;

        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);
        FieldMappingProfileEdit.fillInstanceStatusTerm(instanceStatusTerm);
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.checkCalloutMessage(calloutMessage);
        FieldMappingProfileView.verifyInstanceStatusTerm(instanceStatusTerm);
      },
    );
  });
});
