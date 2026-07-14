import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  FieldMappingProfileEditForm,
  FieldMappingProfileView,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      protectedFieldData: {
        field: '*',
        indicator1: '*',
        indicator2: '*',
        subfield: '5',
        data: 'VLR',
        source: 'USER',
      },
      secondProtectedFieldData: {
        field: '600',
        indicator1: '*',
        indicator2: '*',
        subfield: 'a',
        data: '*',
        source: 'USER',
      },
      mappingProfile: {
        name: `C366101 MARC Authority mapping profile ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      },
      userProperties: {},
    };
    const protectedFieldIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcFieldProtection.createViaApi(testData.protectedFieldData).then((response) => {
        protectedFieldIds.push(response.id);
      });
      MarcFieldProtection.createViaApi(testData.secondProtectedFieldData).then((response) => {
        protectedFieldIds.push(response.id);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      protectedFieldIds.forEach((id) => {
        MarcFieldProtection.deleteViaApi(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfile.name);
    });

    it(
      'C366101 MARC Authority field protections display but disallow override on field mapping create/edit page (folijet)',
      { tags: ['extendedPath', 'folijet', 'C366101'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        FieldMappingProfiles.checkNewMappingProfileFormIsOpened();
        NewFieldMappingProfile.fillMappingProfileForUpdatesMarcAuthority(testData.mappingProfile);
        NewFieldMappingProfile.verifySectionOverrideProtectedFields();
        NewFieldMappingProfile.save();
        FieldMappingProfileView.waitLoading();
        FieldMappingProfileView.edit();
        FieldMappingProfileEditForm.waitLoading();
        FieldMappingProfileEditForm.verifySectionOverrideProtectedFields();
      },
    );
  });
});
