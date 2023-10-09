import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C2349 autotest field mapping profile ${getRandomStringCode(160)}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C2349 Create a new field mapping profile with a long name (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.checkCreateProfileCalloutMessage(mappingProfile.name);
        FieldMappingProfileView.verifyMappingProfileTitleName(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
      },
    );
  });
});
