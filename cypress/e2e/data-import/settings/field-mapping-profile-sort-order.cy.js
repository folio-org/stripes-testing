import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {
      mappingProfiles: [
        {
          name: `A-C377038 ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `B-C377038${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `Z-C377038${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
      ],
    };

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.mappingProfiles.forEach((mappingProfile) => SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name));
    });

    it(
      'C377038 Verify Field mapping profile sort order (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application ->  "Data import" -> "Field mapping profiles" -> Click "New field mapping profile" option
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Create new profile with name started with "A"
        NewFieldMappingProfile.fillSummaryInMappingProfile(testData.mappingProfiles[0]);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        // #3 Close the detail view of the field mapping profile by clicking the "X" icon at the top left
        FieldMappingProfileView.closeViewMode(testData.mappingProfiles[0].name);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        // The list of field mapping profiles is displayed, in alphabetical order
        FieldMappingProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // #4 Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #5 Create new profile with name started with any letter from "B" to "Y"
        NewFieldMappingProfile.fillSummaryInMappingProfile(testData.mappingProfiles[1]);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        // #6 Close the detail view of the field mapping profile by clicking the "X" icon at the top left
        FieldMappingProfileView.closeViewMode(testData.mappingProfiles[1].name);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        // The list of field mapping profiles is displayed, in alphabetical order
        FieldMappingProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // #7 Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #8 Create new profile with name started with letter "Z"
        NewFieldMappingProfile.fillSummaryInMappingProfile(testData.mappingProfiles[2]);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        // #9 Close the detail view of the field mapping profile by clicking the "X" icon at the top left
        FieldMappingProfileView.closeViewMode(testData.mappingProfiles[2].name);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        // * All existing field mapping profiles sorted in **ascending** alphabetical order
        FieldMappingProfiles.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
