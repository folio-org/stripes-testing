import { ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
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
      'C378897 Order field mapping profile: confirm that purchase order lines limit setting does not allow fractional numbers (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Fill mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Enter any fractional number from 0 to 1000 in quotation marks to the "Override purchase order lines limit setting" field (e.g. "2.5")
        FieldMappingProfileEditForm.fillMappingProfileFields({
          orderInformation: { overridePoLineLimit: '2.5' },
        });
        FieldMappingProfileEditForm.checkFieldValidationError({
          orderInformation: [
            {
              label: 'Override purchase order lines limit setting',
              error: 'Please enter a whole number greater than 0 and less than 1000 to continue',
            },
          ],
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton({ profileCreated: false });
        FieldMappingProfileEditForm.checkFieldValidationError({
          orderInformation: [
            {
              label: 'Override purchase order lines limit setting',
              error: 'Please enter a whole number greater than 0 and less than 1000 to continue',
            },
          ],
        });

        // Change PO line limit override value to a whole number
        FieldMappingProfileEditForm.fillMappingProfileFields({
          orderInformation: { overridePoLineLimit: '3' },
        });

        // Click "Save as profile & Close" button
        FieldMappingProfileEditForm.clickSaveAndCloseButton();
      },
    );
  });
});
