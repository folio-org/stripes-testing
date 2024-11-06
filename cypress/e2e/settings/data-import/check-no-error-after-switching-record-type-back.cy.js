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
          name: `autotest_mapping_profile_name_${getRandomPostfix()}`,
          incomingRecordType: 'MARC Bibliographic',
          existingRecordType: 'Order',
        },
        orderInformation: {
          status: ORDER_STATUSES.PENDING,
          vendor: 'GOBI Library Solutions',
        },
        orderLineInformation: {
          title: `autotest_order_line_name_${getRandomPostfix()}`,
          poLineDetails: {
            acquisitionMethod: 'Other',
            orderFormat: 'Other',
            receivingWorkflow: 'Synchronized',
          },
          costDetails: {
            physicalUnitPrice: '1.00',
            currency: 'USD',
          },
        },
      },
      user: {},
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
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
      'C375164 Verify that no error appears after switching from Order record type to another and back (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C375164'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click on "FOLIO record type*" dropdown, Select any value different from step 2 (e.g. Item)
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Item' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ITEM' });

        // Click on "FOLIO record type*" dropdown one more time, Select "Order" option
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Order' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ORDER' });

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click "Save as profile"
        FieldMappingProfileEditForm.clickSaveAndCloseButton();

        // Click "Actions" button, Select "Edit" option
        FieldMappingProfileView.clickEditButton();

        // Click on "FOLIO record type*" dropdown, Select any value different from settled  (e.g. Item)
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Item' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ITEM' });

        // Click on "FOLIO record type*" dropdown one more time, Select "Order" option
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Order' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ORDER' });

        // Make small change of the field mapping profile (e.g change name
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { name: fieldMappingProfile },
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({
          profileCreated: false,
          profileUpdated: true,
        });
        FieldMappingProfileView.checkSummaryFieldsConditions([
          { label: 'Name', conditions: { value: fieldMappingProfile } },
          { label: 'FOLIO record type', conditions: { value: 'Order' } },
        ]);
      },
    );
  });
});
