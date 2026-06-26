import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { ActionProfiles, SettingsDataImport } from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import ActionProfileEditForm from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileEditForm';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;
    const actionProfileName = 'Default - Create instance';

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C466233 Check that "select" is not overlaps "Name" field on Action profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C466233'] },
      () => {
        // Step 1: Open default "Create instance" action profile
        ActionProfiles.search(actionProfileName);
        ActionProfiles.selectActionProfileFromList(actionProfileName);
        ActionProfileView.verifyActionProfileOpened();

        // Step 2-3: Verify that "Select" column is not overlaps "Name" column in associated field mapping profiles list
        ActionProfileView.verifyAssociatedMappingProfileShownColumns([
          'Name',
          'Action',
          'Tags',
          'Updated',
          'Updated by',
        ]);
        ActionProfileView.verifyAssociatedMappingProfileHiddenColumns(['Select', 'Unlink']);

        // Step 4: Click "Edit" button
        ActionProfileView.edit();

        // Step 5-6: Verify that "Select" column is not overlaps "Name" column in associated field mapping profiles list on edit form
        ActionProfileEditForm.verifyAssociatedMappingProfileShownColumns([
          'Name',
          'Action',
          'Tags',
          'Updated',
          'Updated by',
          'Unlink',
        ]);
        ActionProfileEditForm.verifyAssociatedActionProfileHiddenColumns(['Select']);
      },
    );
  });
});
