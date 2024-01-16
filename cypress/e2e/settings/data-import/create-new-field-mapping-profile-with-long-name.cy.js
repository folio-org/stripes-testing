import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

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
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C2349 Create a new field mapping profile with a long name (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const calloutMessage = `The field mapping profile "${mappingProfile.name}" was successfully created`;

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.checkCalloutMessage(calloutMessage);
        FieldMappingProfileView.verifyMappingProfileTitleName(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
      },
    );
  });
});
