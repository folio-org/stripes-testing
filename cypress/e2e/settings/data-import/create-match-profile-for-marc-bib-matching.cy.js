import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const incomingRecordType = 'MARC Bibliographic';

    beforeEach('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
      });
    });

    afterEach('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C9321 Create match profile for MARC Bib matching to a FOLIO record type (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9321'] },
      () => {
        const matchProfile = {
          profileName: `C9321 001 to Instance HRID ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.verifyExistingRecordSection([
          'INSTANCE',
          'HOLDINGS',
          'ITEM',
          'MARC_BIBLIOGRAPHIC',
          'MARC_AUTHORITY',
        ]);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.selectExistingRecordField(matchProfile.instanceOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithFolioRecordValue(matchProfile, incomingRecordType);

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );

    it(
      'C9322 Create match profile for MARC Bib matching to a MARC record type (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9322'] },
      () => {
        const matchProfile = {
          profileName: `C9322 autotest match profile_${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          existingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.verifyExistingRecordSection([
          'INSTANCE',
          'HOLDINGS',
          'ITEM',
          'MARC_BIBLIOGRAPHIC',
          'MARC_AUTHORITY',
        ]);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.fillExistingRecordSections(matchProfile);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithIncomingAndExistingValue(
          matchProfile,
          incomingRecordType,
        );

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );

    it(
      'C9323 Create match profile for Static value TEXT match (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9323'] },
      () => {
        const matchProfile = {
          profileName: `C9323 autotest match profile_${getRandomPostfix()}`,
          incomingStaticValue: 'Online',
          incomingStaticRecordValue: 'Text',
          matchCriterion: 'Existing value contains incoming value',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingRecordOption: NewMatchProfile.optionsList.holdingsHrid,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.verifyExistingRecordSection([
          'INSTANCE',
          'HOLDINGS',
          'ITEM',
          'MARC_BIBLIOGRAPHIC',
          'MARC_AUTHORITY',
        ]);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillStaticValue(
          matchProfile.incomingStaticValue,
          matchProfile.incomingStaticRecordValue,
        );
        NewMatchProfile.selectMatchCriterion(matchProfile.matchCriterion);
        NewMatchProfile.selectExistingRecordField(matchProfile.existingRecordOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithStaticValueAndFolioRecordValue(matchProfile);

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );

    it(
      'C9324 Create match profile for Static value NUMBER match (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9324'] },
      () => {
        const matchProfile = {
          profileName: `C9324 autotest match profile_${getRandomPostfix()}`,
          incomingStaticValue: '3456',
          incomingStaticRecordValue: 'Number',
          matchCriterion: 'Existing value contains incoming value',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingRecordOption: NewMatchProfile.optionsList.holdingsHrid,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillStaticValue(
          matchProfile.incomingStaticValue,
          matchProfile.incomingStaticRecordValue,
        );
        NewMatchProfile.selectMatchCriterion(matchProfile.matchCriterion);
        NewMatchProfile.selectExistingRecordField(matchProfile.existingRecordOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithStaticValueAndFolioRecordValue(matchProfile);

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );

    it(
      'C9325 Create match profile for Static value DATE match (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9325'] },
      () => {
        const matchProfile = {
          profileName: `C9324 autotest match profile_${getRandomPostfix()}`,
          incomingStaticValue: DateTools.getFormattedDate({ date: new Date() }),
          incomingStaticRecordValue: 'Date',
          matchCriterion: 'Existing value contains incoming value',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingRecordOption: NewMatchProfile.optionsList.holdingsHrid,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillStaticValue(
          matchProfile.incomingStaticValue,
          matchProfile.incomingStaticRecordValue,
        );
        NewMatchProfile.selectMatchCriterion(matchProfile.matchCriterion);
        NewMatchProfile.selectExistingRecordField(matchProfile.existingRecordOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithStaticValueAndFolioRecordValue(matchProfile);

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );

    it(
      'C9326 Create match profile for Static value DATE RANGE match (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9326'] },
      () => {
        const matchProfile = {
          profileName: `C9325 autotest match profile_${getRandomPostfix()}`,
          incomingStaticValue: DateTools.getFormattedDate({ date: new Date() }),
          incomingStaticRecordValue: 'Date range',
          matchCriterion: 'Existing value contains incoming value',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingRecordOption: NewMatchProfile.optionsList.holdingsHrid,
        };

        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.clickCreateNewMatchProfile();
        NewMatchProfile.fillName(matchProfile.profileName);
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.verifyExistingRecordTypeIsSelected(matchProfile.existingRecordType);
        NewMatchProfile.fillStaticValue(
          matchProfile.incomingStaticValue,
          matchProfile.incomingStaticRecordValue,
        );
        NewMatchProfile.selectMatchCriterion(matchProfile.matchCriterion);
        NewMatchProfile.selectExistingRecordField(matchProfile.existingRecordOption);
        NewMatchProfile.saveAndClose();
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileWithStaticValueAndFolioRecordValue(matchProfile);

        cy.getAdminToken().then(() => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        });
      },
    );
  });
});
