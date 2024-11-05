import { ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfileView,
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const fieldMappingProfile = `autotest_mapping_profile_name_${getRandomPostfix()}`;

    const testData = {
      mappingProfile: {
        summary: {
          name: fieldMappingProfile,
          incomingRecordType: 'MARC Bibliographic',
          existingRecordType: 'Order',
        },
        orderInformation: {
          vendor: 'GOBI Library Solutions',
        },
        orderLineInformation: {
          title: '245$a',
          poLineDetails: {
            acquisitionMethod: 'Other',
            orderFormat: 'Other',
            receivingWorkflow: 'Synchronized',
          },
          costDetails: {
            currency: 'USD',
          },
        },
      },
      user: {},
    };

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.dataImportSettingsPath,
          waiter: SettingsDataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(fieldMappingProfile);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C380419 Order field mapping profile: Confirm that "Purchase order status" is a required field (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380419'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: false });
        FieldMappingProfileEditForm.checkFieldValidationError({
          orderInformation: [{ label: 'Purchase order status', error: 'Please enter a value' }],
          shouldBlur: true,
        });

        // Select any value from the "Purchase order status" dropdown list
        FieldMappingProfileEditForm.fillOrderInformationProfileFields({
          status: ORDER_STATUSES.PENDING,
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();

        // Click "Action" button, Select "Edit" option
        FieldMappingProfileView.clickEditButton();

        // Delete value from the "Purchase order status" field
        FieldMappingProfileEditForm.fillOrderInformationProfileFields({
          status: null,
          clearField: true,
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: false });
        FieldMappingProfileEditForm.checkFieldValidationError({
          orderInformation: [{ label: 'Purchase order status', error: 'Please enter a value' }],
          shouldBlur: true,
        });

        // Select any value from the "Purchase order status" dropdown list
        FieldMappingProfileEditForm.fillOrderInformationProfileFields({
          status: ORDER_STATUSES.OPEN,
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: true });
      },
    );
  });
});
