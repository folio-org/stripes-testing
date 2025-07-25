import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SelectProfileModal from '../../../support/fragments/settings/dataImport/modals/selectProfileModal';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      mappingProfiles: [
        {
          name: `A-C377046${getRandomPostfix()}`,
        },
        {
          name: `B-C377046${getRandomPostfix()}`,
        },
        {
          name: `C-C377046${getRandomPostfix()}`,
        },
        {
          name: `D-C377046${getRandomPostfix()}`,
        },
        {
          name: `Z-C377046${getRandomPostfix()}`,
        },
      ],

      newMappingProfile: {
        name: `E-C377046${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      },
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      testData.mappingProfiles.forEach((mappingProfile) => {
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.mappingProfiles.forEach((mappingProfile) => SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name));
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
        testData.newMappingProfile.name,
      );
    });

    it(
      'C377046 Verify Field mapping profiles alphabetical order (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C377046'] },
      () => {
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
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.openNewActionProfileForm();

        // #6 Click "Link profile" button
        NewActionProfile.clickLinkProfileButton();
        SelectProfileModal.verifyProfilesIsSortedInAlphabeticalOrder();
      },
    );
  });
});
