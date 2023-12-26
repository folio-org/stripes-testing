import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import SettingsMappingProfiles from '../../../support/fragments/settings/dataImport/settingsMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfile = {
      name: `C367955testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      materialSupplier: 'Amazon.com',
      accessProvider: 'EBSCO',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const sectionValues = [
      { sectionName: 'Vendor', value: 'GOBI Library Solutions', isRequired: true },
      { sectionName: 'Material supplier', value: 'Amazon.com', isRequired: false },
      { sectionName: 'Access provider', value: 'EBSCO', isRequired: false },
    ];

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.openNewMappingProfileForm,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      FieldMappingProfiles.getFieldMappingProfileInDataImport({
        query: `"name"=="${mappingProfile.name}"`,
      }).then((response) => {
        SettingsMappingProfiles.deleteMappingProfileApi(response.id);
      });
    });

    it(
      'C376970 Order field mapping profile: Check vendor mapping UI (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application-> Select "Data import" setting-> Select "Field mapping profiles"-> Click on "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Fill in the following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);

        // #3 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();

        // #4 View the organization details of the newly-created field mapping profile
        sectionValues.forEach(({ sectionName, value }) => {
          FieldMappingProfileView.verifyValueBySection(sectionName, value);
        });

        // #5 Click "Actions" button -> select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);

        // #6 View the organization details of the newly-created field mapping profile in the Edit screen
        sectionValues.forEach(({ sectionName, value, isRequired }) => {
          FieldMappingProfileEdit.verifyValueBySection(sectionName, value, isRequired);
        });
      },
    );
  });
});
