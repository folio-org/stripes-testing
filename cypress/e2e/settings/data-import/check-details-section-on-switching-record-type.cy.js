import { Permissions } from '../../../support/dictionary';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import {
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const mappingFields = [{ name: 'vendor', value: `"${organization.id}"` }];

    const testData = {
      organization,
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // profile should not have any differences from one created manually
          cy.getAcqUnitsApi({ sortby: 'value', limit: 1000 }).then(({ body }) => {
            const acceptedValues = body.acquisitionsUnits.reduce((acc, it) => {
              return { ...acc, [it.id]: it.name };
            }, {});
            mappingFields.push({ name: 'acqUnitIds', acceptedValues });
          });
          cy.getAcquisitionMethodsApi({ sortby: 'value', limit: 1000 }).then(({ body }) => {
            const acceptedValues = body.acquisitionMethods.reduce((acc, it) => {
              return { ...acc, [it.id]: it.value };
            }, {});
            mappingFields.push({ name: 'acquisitionMethod', acceptedValues });
          });
          MaterialTypes.getMaterialTypesViaApi({ sortby: 'name', limit: 1000 }).then(
            ({ mtypes }) => {
              const acceptedValues = mtypes.reduce((acc, it) => {
                return { ...acc, [it.id]: it.name };
              }, {});
              mappingFields.push({ name: 'materialType', acceptedValues });
            },
          );
        })
        .then(() => {
          testData.mapping = FieldMappingProfiles.getDefaultMappingProfile({
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            existingRecordType: 'ORDER',
            mappingFields,
          });
          Organizations.createOrganizationViaApi(testData.organization);
          FieldMappingProfiles.createMappingProfileViaApi(testData.mapping);
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
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        FieldMappingProfiles.deleteMappingProfileViaApi(testData.mapping.profile.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    // TODO added tag broken FAT-12155
    it(
      'C376005 Order field mapping profile: Order type field is empty after switching to another FOLIO record type (folijet) (TaaS)',
      { tags: ['extendedPathBroken', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Open field mapping profile view for order record
        const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
          name: testData.mapping.profile.name,
          type: 'ORDER',
        });

        // Click "Actions" button, Click "Edit" option.
        const FieldMappingProfileEditForm = FieldMappingProfileView.clickEditButton();

        // Click on the "FOLIO record type" dropdown, Select "Item" type
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Item' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ITEM' });
        FieldMappingProfileEditForm.checkButtonsConditions([
          { label: 'Save as profile & Close', conditions: { disabled: false } },
        ]);

        // Click on the "FOLIO record type" dropdown, Select "Order" type
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { existingRecordType: 'Order' },
        });
        FieldMappingProfileEditForm.verifyFormView({ type: 'ORDER' });
        FieldMappingProfileEditForm.checkButtonsConditions([
          { label: 'Save as profile & Close', conditions: { disabled: true } },
        ]);
      },
    );
  });
});
