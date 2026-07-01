import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import {
  FieldMappingProfileEditForm,
  FieldMappingProfiles,
  FieldMappingProfileView,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;
    const fieldMappingProfileName = 'Default - Create instance';

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C466232 Check that "select" is not overlaps "Name" field on Field mapping profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C466232'] },
      () => {
        // Step 1: Open default "Create instance" field mapping profile
        FieldMappingProfiles.search(fieldMappingProfileName);
        FieldMappingProfiles.selectMappingProfileFromList(fieldMappingProfileName);
        FieldMappingProfileView.verifyMappingProfileOpened();

        // Step 2: Verify that "Select" column is not overlaps "Name" column in associated action profiles list
        FieldMappingProfileView.verifyAssociatedActionProfileShownColumns([
          'Name',
          'Action',
          'Tags',
          'Updated',
          'Updated by',
        ]);
        FieldMappingProfileView.verifyAssociatedActionProfileHiddenColumns(['Select', 'Unlink']);

        // Step 3: Click "Edit" button
        FieldMappingProfileView.clickEditButton();

        // Step 4: Verify that "Select" column is not overlaps "Name" column in associated action profiles list on edit form
        FieldMappingProfileEditForm.verifyAssociatedActionProfileShownColumns([
          'Name',
          'Action',
          'Tags',
          'Updated',
          'Updated by',
          'Unlink',
        ]);
        FieldMappingProfileEditForm.verifyAssociatedActionProfileHiddenColumns(['Select']);
      },
    );
  });
});
