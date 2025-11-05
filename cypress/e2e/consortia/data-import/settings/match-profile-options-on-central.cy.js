import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { MatchProfiles as SettingsMatchProfiles } from '../../../../support/fragments/settings/dataImport';
import MatchProfileEditForm from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('Consortia', () => {
      let user;
      const matchProfile = {
        profileName: `C421990 match profile${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '001',
          subfield: 'a',
        },
        existingRecordFields: {
          field: '001',
          subfield: 'a',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const detailsOptions = ['INSTANCE', 'MARC_BIBLIOGRAPHIC', 'MARC_AUTHORITY'];

      before('Create test data', () => {
        cy.getAdminToken();
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

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
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      });

      it(
        'C421990 (CONSORTIA) Verify the match profile options on Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C421990'] },
        () => {
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.waitLoading();
          MatchProfiles.clickCreateNewMatchProfile();
          NewMatchProfile.verifyExistingRecordSection(detailsOptions);
          NewMatchProfile.close();

          MatchProfiles.search(matchProfile.profileName);
          MatchProfileView.verifyMatchProfileOpened();
          detailsOptions.forEach((option) => {
            MatchProfileView.verifyExistingDetails(option);
          });
          MatchProfileView.edit();
          MatchProfileEditForm.verifyDetailsSection(detailsOptions);
        },
      );
    });
  });
});
