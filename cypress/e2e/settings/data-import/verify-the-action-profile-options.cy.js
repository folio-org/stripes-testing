import { ACTION_NAMES_IN_ACTION_PROFILE, APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileEdit from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const mappingProfile = {
      name: `C421995 mapping profile${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C421995 action profile${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfileResponse.body.id);
        },
      );
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421995 (NON-CONSORTIA) Verify the action profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C421995'] },
      () => {
        const actionCreate = ACTION_NAMES_IN_ACTION_PROFILE.CREATE;
        const actionModify = ACTION_NAMES_IN_ACTION_PROFILE.MODIFY;
        const recordTypeBibliographic = 'MARC Bibliographic';

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        ['Instance', 'Holdings', 'Item', 'Order', 'Invoice', 'MARC Authority'].forEach((type) => {
          NewActionProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewActionProfile.clickClose();
        SettingsActionProfiles.search(actionProfile.name);
        SettingsActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.edit();

        ActionProfileEdit.changeAction(actionCreate);

        ['Instance', 'Holdings', 'Item', 'Order', 'Invoice'].forEach((type) => {
          ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });

        ActionProfileEdit.changeAction();

        ['Instance', 'Holdings', 'Item', 'MARC Bibliographic', 'MARC Authority'].forEach((type) => {
          ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });

        ActionProfileEdit.changeRecordType(recordTypeBibliographic);
        ActionProfileEdit.changeAction(actionModify);
        ActionProfileEdit.verifyFOLIORecordTypeOptionExists(recordTypeBibliographic);
      },
    );
  });
});
