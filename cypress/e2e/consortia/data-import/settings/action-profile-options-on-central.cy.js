import { APPLICATION_NAMES, FOLIO_RECORD_TYPE } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import ActionProfileEditForm from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfileEditForm';
import ActionProfileView from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const mappingProfile = {
      name: `C421993 Mapping profiel${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: `C421993 Action profile${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const recordTypeOptionsForNew = [
      'Instance',
      'Invoice',
      'Order',
      'MARC Bibliographic',
      'MARC Authority',
    ];
    const recordTypeOptionsForCreated = ['Instance', 'MARC Bibliographic', 'MARC Authority'];

    before('Create test data', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfileResponse.body.id);
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C421993 (CONSORTIA) Verify the action profile options on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C421993'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.waitLoading();
        SettingsActionProfiles.createNewActionProfile();
        NewActionProfile.verifyFolioRecordTypeOptions(recordTypeOptionsForNew);
        NewActionProfile.clickClose();

        SettingsActionProfiles.waitLoading();
        SettingsActionProfiles.search(actionProfile.name);
        ActionProfileView.edit();
        ActionProfileEditForm.waitLoading();
        ActionProfileEditForm.verifyFolioRecordType(recordTypeOptionsForCreated);
      },
    );
  });
});
