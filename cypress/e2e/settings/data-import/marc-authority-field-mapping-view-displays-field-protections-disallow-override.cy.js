import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        protectedFieldData: {
          field: '*',
          indicator1: '*',
          indicator2: '*',
          subfield: '6',
          data: 'YHN366102',
          source: 'USER',
        },
        secondProtectedFieldData: {
          field: '602',
          indicator1: 'n',
          indicator2: 'm',
          subfield: 'y',
          data: '*',
          source: 'USER',
        },
        mappingProfile: {
          name: `AT_C366102_MarcAuthMappingProfile_${randomPostfix}`,
        },
      };
      const protectedFieldIds = [];

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcFieldProtection.createViaApi(testData.protectedFieldData).then(({ id }) => {
          protectedFieldIds.push(id);
        });
        MarcFieldProtection.createViaApi(testData.secondProtectedFieldData).then(({ id }) => {
          protectedFieldIds.push(id);
        });
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(testData.mappingProfile);

        cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then(
          (createdUserProperties) => {
            testData.user = createdUserProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: SettingsMenu.mappingProfilePath,
              waiter: FieldMappingProfiles.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.user.userId);
        protectedFieldIds.forEach((id) => {
          MarcFieldProtection.deleteViaApi(id);
        });
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfile.name);
      });

      it(
        'C366102 Verify MARC Authority Field Mapping View page: display field protections but disallow override (promin)',
        { tags: ['extendedPath', 'promin', 'C366102'] },
        () => {
          // Step 1: Open the field mapping profile detail view
          FieldMappingProfiles.search(testData.mappingProfile.name);
          FieldMappingProfiles.selectMappingProfileFromList(testData.mappingProfile.name);
          FieldMappingProfileView.verifyMappingProfileOpened();
          FieldMappingProfileView.verifyMappingProfileTitleName(testData.mappingProfile.name);

          // Step 2: Verify Override protected fields accordion is expanded with correct columns and disabled checkboxes
          FieldMappingProfileView.verifySectionOverrideProtectedFields();
        },
      );
    });
  });
});
