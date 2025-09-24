import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;

      before('Create test data', () => {
        cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C813005 (CONSORTIA) Verify the suppressed MARC Holdings job profile in Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C813005'] },
        () => {
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.waitLoadingList();
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS);
          JobProfiles.verifyJobProfileAbsent();
        },
      );
    });
  });
});
