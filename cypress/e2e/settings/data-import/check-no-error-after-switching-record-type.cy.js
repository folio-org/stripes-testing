import { Permissions } from '../../../support/dictionary';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import {
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { BatchGroups } from '../../../support/fragments/settings/invoices';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      mappings: {
        item: FieldMappingProfiles.getDefaultMappingProfile({
          existingRecordType: 'ITEM',
        }),
        holding: FieldMappingProfiles.getDefaultMappingProfile({
          existingRecordType: 'HOLDINGS',
        }),
      },
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.createMappingProfileViaApi(testData.mappings.item);
        FieldMappingProfiles.createMappingProfileViaApi(testData.mappings.holding);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.dataImportSettingsPath,
        waiter: SettingsDataImport.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.deleteMappingProfileViaApi(testData.mappings.item.profile.id);
        FieldMappingProfiles.deleteMappingProfileViaApi(testData.mappings.holding.profile.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    describe('Settings', () => {
      it(
        'C376001 Verify no error appears after switching record types when duplicating existing field mapping profile (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet', 'C376001'] },
        () => {
          // Go to Settings application-> Data import-> Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

          // Open field mapping profile view for item records
          const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.item.profile.name,
            type: 'ITEM',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.item.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Item' } },
          ]);

          // Close those details by clicking the x at the top left of the screen
          FieldMappingProfileView.clickCloseButton();

          // Open field mapping profile view for Inventory holdings records
          FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.holding.profile.name,
            type: 'HOLDINGS',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.holding.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Holdings' } },
          ]);

          // Click "Actions" button, Click "Duplicate" option
          const FieldMappingProfileEditForm = FieldMappingProfileView.clickDuplicateButton();

          // Click "Close" button
          FieldMappingProfileEditForm.clickCloseButton({ closeWoSaving: false });
        },
      );

      it(
        'C376002 Verify no error appears after switching record types when viewing a field mapping profile, then editing a different one (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet', 'C376002'] },
        () => {
          // Go to Settings application-> Data import-> Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

          // Open field mapping profile view for item records
          const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.item.profile.name,
            type: 'ITEM',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.item.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Item' } },
          ]);

          // Close those details by clicking the x at the top left of the screen
          FieldMappingProfileView.clickCloseButton();

          // Open field mapping profile view for Inventory holdings records
          FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.holding.profile.name,
            type: 'HOLDINGS',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.holding.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Holdings' } },
          ]);

          // Click "Actions" button, Click "Edit" option
          const FieldMappingProfileEditForm = FieldMappingProfileView.clickEditButton();

          // Click "Close" button
          FieldMappingProfileEditForm.clickCloseButton({ closeWoSaving: false });
        },
      );
    });

    describe('Settings', () => {
      testData.batchGroup = BatchGroups.getDefaultBatchGroup();
      testData.organization = NewOrganization.getDefaultOrganization();
      testData.mappings.invoice = FieldMappingProfiles.getDefaultMappingProfile({
        existingRecordType: 'INVOICE',
        mappingFields: [
          {
            name: 'batchGroupId',
            value: `"${testData.batchGroup.name}"`,
          },
          {
            name: 'vendorId',
            value: `"${testData.organization.id}"`,
          },
        ],
      });

      before('Create Invoice mapping profile', () => {
        cy.getAdminToken().then(() => {
          BatchGroups.createBatchGroupViaApi(testData.batchGroup);
          Organizations.createOrganizationViaApi(testData.organization);
          FieldMappingProfiles.createMappingProfileViaApi(testData.mappings.invoice);
        });
      });

      after('Delete Invoice mapping profile', () => {
        cy.getAdminToken().then(() => {
          FieldMappingProfiles.deleteMappingProfileViaApi(testData.mappings.invoice.profile.id);
          Organizations.deleteOrganizationViaApi(testData.organization.id);
          BatchGroups.deleteBatchGroupViaApi(testData.batchGroup.id);
        });
      });

      it(
        'C376004 Verify no error appears after switching record types when starting duplicate an invoice field mapping profile, then a different one (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet', 'C376004'] },
        () => {
          // Go to Settings application-> Data import-> Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

          // Open field mapping profile view for Invoice record
          const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.invoice.profile.name,
            type: 'INVOICE',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.invoice.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Invoice' } },
          ]);

          // Click "Actions" button, Click "Duplicate" option
          const FieldMappingProfileEditForm = FieldMappingProfileView.clickDuplicateButton();

          // Click "Close" button
          FieldMappingProfileEditForm.clickCloseButton({ closeWoSaving: false });

          // Close those details by clicking the x at the top left of the screen
          FieldMappingProfileView.clickCloseButton();

          // Open field mapping profile view for Inventory holdings records
          FieldMappingProfiles.openFieldMappingProfileView({
            name: testData.mappings.holding.profile.name,
            type: 'HOLDINGS',
          });
          FieldMappingProfileView.checkSummaryFieldsConditions([
            { label: 'Name', conditions: { value: testData.mappings.holding.profile.name } },
            { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
            { label: 'FOLIO record type', conditions: { value: 'Holdings' } },
          ]);
        },
      );
    });
  });
});
