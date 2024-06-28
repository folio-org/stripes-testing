import { ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfileView,
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const fieldMappingProfile = `autotest_mapping_profile_name_${getRandomPostfix()}`;
    const billToName = `autotest_address_name_${getRandomPostfix()}`;
    const billToAddress = `autotest_address_value_${getRandomPostfix()}`;
    const shipToName = `autotest_address_name_${getRandomPostfix()}`;
    const shipToAddress = `autotest_address_value_${getRandomPostfix()}`;

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
          billToName,
          shipToName,
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
      addresses: [
        Addresses.generateAddressConfig({ name: billToName, address: billToAddress }),
        Addresses.generateAddressConfig({ name: shipToName, address: shipToAddress }),
      ],
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        testData.addresses.forEach((address) => Addresses.createAddressViaApi(address));
      });

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
        testData.addresses.forEach((address) => Addresses.deleteAddressViaApi(address));
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(fieldMappingProfile);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C376000 Order field mapping profile: check stacking of Bill to/Ship to addresses (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Populate mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Press the "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: true });

        // Review the "Bill to address" and "Ship to address" details on the View screen
        FieldMappingProfileView.checkOrderFieldsConditions([
          { label: 'Bill to address', conditions: { value: `"${billToAddress}"` } },
          { label: 'Ship to address', conditions: { value: `"${shipToAddress}"` } },
        ]);

        // Click "Actions" button-> Click "Edit" option
        FieldMappingProfileView.clickEditButton();

        // #6 Review the "Bill to address" and "Ship to address" details on the Edit screen
        // * "Bill to address" and "Ship to address" values displaying with spaces between line breaks as in Settings/Tenant/Addresses
        FieldMappingProfileEditForm.checkFieldsConditions([
          {
            label: 'Order information -> Bill to address',
            conditions: { value: `"${billToAddress}"` },
          },
          {
            label: 'Order information -> Ship to address',
            conditions: { value: `"${shipToAddress}"` },
          },
        ]);

        // Add something in the description
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { description: `autotest_mapping_profile_description_${getRandomPostfix()}` },
        });

        // Press the "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: false });

        // Review the "Bill to address" and "Ship to address" details on the View screen
        FieldMappingProfileView.checkOrderFieldsConditions([
          { label: 'Bill to address', conditions: { value: `"${billToAddress}"` } },
          { label: 'Ship to address', conditions: { value: `"${shipToAddress}"` } },
        ]);
      },
    );
  });
});
