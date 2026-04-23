import { ORDER_STATUSES, VENDOR_NAMES } from '../../../support/constants';
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
import Organizations from '../../../support/fragments/organizations/organizations';

describe('Data Import', () => {
  describe('Settings', () => {
    const organization = {
      name: VENDOR_NAMES.EBSCO,
      status: 'Active',
      code: 'SREBSCO',
      isVendor: true,
      erpCode: 'G64758-74837',
    };
    const mappingProfileName = `autotest_mapping_profile_name_${getRandomPostfix()}`;
    const testData = {
      mappingProfile: {
        summary: {
          name: mappingProfileName,
          incomingRecordType: 'MARC Bibliographic',
          existingRecordType: 'Order',
        },
        orderInformation: {
          status: ORDER_STATUSES.PENDING,
          organizationLookUp: 'GOBI Library Solutions',
        },
        orderLineInformation: {
          title: '245$a',
          poLineDetails: {
            acquisitionMethod: 'Other',
            orderFormat: 'P/E Mix',
            receivingWorkflow: 'Synchronized',
          },
          costDetails: {
            physicalUnitPrice: '1.00',
            currency: 'USD',
          },
          physicalResourceDetails: {
            organizationLookUp: 'Otto Harrassowitz GmbH & Co. KG',
          },
          eResourceDetails: {
            organizationLookUp: 'EBSCO SUBSCRIPTION SERVICES',
          },
        },
      },
      user: {},
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
        (orgResp) => {
          if (orgResp.id) {
            organization.id = orgResp.id;
          } else {
            Organizations.createOrganizationViaApi(organization).then((id) => {
              organization.id = id;
            });
          }
        },
      );
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
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C378896 Order field mapping: Confirm Vendor/Material supplier/Access provider fields can be manually cleared/edited (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C378896'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Fill mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();

        // Click "Actions" button, Select "Edit" option
        FieldMappingProfileView.clickEditButton();

        // Change fields manually
        FieldMappingProfileEditForm.fillMappingProfileFields({
          orderInformation: { vendor: '970$a' },
          orderLineInformation: {
            physicalResourceDetails: { materialSupplier: '970$b' },
            eResourceDetails: { accessProvider: '970$c' },
          },
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({
          profileCreated: false,
          profileUpdated: true,
        });

        // Check "Vendor", "Material Supplier" and "Access provider" fields
        FieldMappingProfileView.checkOrderFieldsConditions([
          { label: 'Vendor', conditions: { value: '"970$a"' } },
        ]);
        FieldMappingProfileView.checkOrderLineFieldsConditions([
          { label: 'Material supplier', conditions: { value: '"970$b"' } },
          { label: 'Access provider', conditions: { value: '"970$c"' } },
        ]);
      },
    );
  });
});
