import { ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfileView,
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
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
          status: ORDER_STATUSES.PENDING,
          vendor: 'GOBI Library Solutions',
        },
        orderLineInformation: {
          title: '245$a',
          poLineDetails: {
            acquisitionMethod: 'Other',
            orderFormat: 'P/E Mix',
            receivingWorkflow: 'Synchronized',
          },
          costDetails: {
            currency: 'USD',
          },
          locations: [],
          physicalResourceDetails: {
            materialType: 'book',
          },
          eResourceDetails: {
            materialType: 'microform',
          },
        },
      },
      servicePoint: ServicePoints.getDefaultServicePoint(),
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);

        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location);
      });

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
        Locations.deleteViaApi(testData.location);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C380543 Order field mapping profile: Verify that Material type field is inactive after switching from pending to open status in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click "Add location" button in the "Location" accordion and populate fields
        FieldMappingProfileEditForm.fillMappingProfileFields({
          orderLineInformation: {
            locations: [
              {
                name: `${testData.location.name} (${testData.location.code})`,
                quantityPhysical: '1',
                quantityElectronic: '1',
              },
            ],
          },
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();

        // Click "Action" button, Select "Edit" option
        FieldMappingProfileView.clickEditButton();

        // In the "Purchase order status" field select **"Open"** option
        FieldMappingProfileEditForm.fillMappingProfileFields({
          orderInformation: { status: ORDER_STATUSES.OPEN },
        });

        // "Material type" field in the "Physical resource details" accordion is greyed out and **disabled**
        // "Material type" field in the "E-resources details" accordion is greyed out and **disabled**
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Physical resource details -> Material type',
            conditions: { disabled: true, value: '' },
          },
          {
            label: 'E-resources details -> Material type',
            conditions: { disabled: true, value: '' },
          },
        ]);

        // "Add location" button is active and clickable
        FieldMappingProfileEditForm.checkButtonsConditions([
          { label: 'Add location', conditions: { disabled: false } },
        ]);

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();
        FieldMappingProfileView.checkElectronicResourceDetailsFieldsConditions([
          { label: 'Material type', conditions: { value: 'No value set-' } },
        ]);
        FieldMappingProfileView.checkPhysicalResourceDetailsFieldsConditions([
          { label: 'Material type', conditions: { value: 'No value set-' } },
        ]);
      },
    );
  });
});
