import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2352 autotest field mapping profile ${getRandomStringCode(8)}`,
    };

    const calloutErrorMessage = `The field mapping profile '${mappingProfile.name}' already exists`;

    const duplicatedMappingProfile = {
      name: `C2352 autotest field mapping profile ${getRandomStringCode(8)}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
    };

    before('create user and profile', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.verifyMappingProfileTitleName(mappingProfile.name);
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          duplicatedMappingProfile.name,
        );
      });
    });

    it(
      'C2352 Duplicate an existing field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2352'] },
      () => {
        const calloutMessage = `The field mapping profile "${duplicatedMappingProfile.name}" was successfully created`;

        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addFolioRecordType(duplicatedMappingProfile.typeValue);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkCalloutMessage(calloutErrorMessage);
        NewFieldMappingProfile.addName(duplicatedMappingProfile.name);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage(calloutMessage);
        FieldMappingProfileView.closeViewMode(duplicatedMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(duplicatedMappingProfile.name);
      },
    );
  });
});
