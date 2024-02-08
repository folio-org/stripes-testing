import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import SelectMappingProfile from '../../../support/fragments/settings/dataImport/modals/selectProfileModal';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {
      mappingProfiles: [
        {
          name: `A-C377046${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `B-C377046${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `C-C377046${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `D-C377046${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        {
          name: `Z-C377046${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
      ],

      newMappingProfile: {
        name: `E-C377046${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      },
    };

    before('create test data', () => {
      cy.getAdminToken();
      testData.mappingProfiles.forEach((mappingProfile) => {
        NewFieldMappingProfile.createMappingProfileViaApi(mappingProfile.name);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.mappingProfiles.forEach((mappingProfile) => SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name));
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
        testData.newMappingProfile.name,
      );
    });

    it(
      'C377046 Verify Field mapping profiles alphabetical order (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application ->  "Data import" -> "Field mapping profiles" -> Click "New field mapping profile" option
        cy.visit(SettingsMenu.mappingProfilePath);

        // #2 Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #3 Create a new "Field Mapping Profile" by filling fields. Click "Save as profile & Close" button
        NewFieldMappingProfile.fillSummaryInMappingProfile(testData.newMappingProfile);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();

        // #4 Close the detail view of the field mapping profile by clicking the "X" icon at the top left of the fourth pane
        FieldMappingProfileView.closeViewMode(testData.newMappingProfile.name);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.verifyProfilesIsSortedInAlphabeticalOrder();

        // #5 Select "Action profiles" -> click "Actions" button -> Select "New action profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #6 Click "Link profile" button
        NewFieldMappingProfile.clickLinkProfileButton();
        SelectMappingProfile.waitLoading();
        FieldMappingProfiles.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
