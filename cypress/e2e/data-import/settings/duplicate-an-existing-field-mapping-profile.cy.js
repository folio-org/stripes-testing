import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
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
        cy.login(user.username, user.password);
      });
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.verifyMappingProfileTitleName(mappingProfile.name);
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      FieldMappingProfileView.deleteViaApi(duplicatedMappingProfile.name);
    });

    it(
      'C2352 Duplicate an existing field mapping profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addFolioRecordType(duplicatedMappingProfile.typeValue);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkCalloutMessage(calloutErrorMessage);
        NewFieldMappingProfile.addName(duplicatedMappingProfile.name);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCreateProfileCalloutMessage(duplicatedMappingProfile.name);
        FieldMappingProfileView.closeViewMode(duplicatedMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(duplicatedMappingProfile.name);
        FieldMappingProfileView.closeViewMode(duplicatedMappingProfile.name);
      },
    );
  });
});
