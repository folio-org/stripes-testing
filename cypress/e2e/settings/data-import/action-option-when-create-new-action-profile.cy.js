import { ACTION_NAMES_IN_ACTION_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  ActionProfiles as SettingsActionProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      user: {},
      actionOptions: [
        ACTION_NAMES_IN_ACTION_PROFILE.CREATE,
        ACTION_NAMES_IN_ACTION_PROFILE.MODIFY,
        ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      ],
      createRecordTypes: ['Instance', 'Holdings', 'Item', 'Order', 'Invoice', 'Linked data'],
      modifyRecordTypes: ['MARC Bibliographic'],
      updateRecordTypes: [
        'Instance',
        'Holdings',
        'Item',
        'MARC Bibliographic',
        'MARC Authority',
        'Linked data',
      ],
    };

    before('Create user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.dataImportSettingsPath,
          waiter: SettingsDataImport.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C358979 Checking "Action" option when create a new action profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C358979'] },
      () => {
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyActionOptions(testData.actionOptions);

        NewActionProfile.chooseAction(ACTION_NAMES_IN_ACTION_PROFILE.CREATE);
        NewActionProfile.verifyFolioRecordTypeOptions(testData.createRecordTypes);
        testData.createRecordTypes.forEach((recordType) => {
          NewActionProfile.chooseRecordType(recordType);
          NewActionProfile.verifySelectedFolioRecordType(recordType);
        });

        NewActionProfile.chooseAction(ACTION_NAMES_IN_ACTION_PROFILE.MODIFY);
        NewActionProfile.verifyFolioRecordTypeOptions(testData.modifyRecordTypes);
        testData.modifyRecordTypes.forEach((recordType) => {
          NewActionProfile.chooseRecordType(recordType);
          NewActionProfile.verifySelectedFolioRecordType(recordType);
        });

        NewActionProfile.chooseAction(ACTION_NAMES_IN_ACTION_PROFILE.UPDATE);
        NewActionProfile.verifyFolioRecordTypeOptions(testData.updateRecordTypes);
        testData.updateRecordTypes.forEach((recordType) => {
          NewActionProfile.chooseRecordType(recordType);
          NewActionProfile.verifySelectedFolioRecordType(recordType);
        });

        NewActionProfile.closeProfileWithoutSaving();
      },
    );
  });
});
