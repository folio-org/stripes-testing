import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C399081 match profile 1_${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C399081 match profile 2_${getRandomPostfix()}`,
        },
      },
      {
        matchProfile: {
          profileName: `C399081 submatch match profile 1_${getRandomPostfix()}`,
          incomingStaticValue: `Text_${getRandomPostfix()}`,
          incomingStaticRecordValue: 'Text',
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          existingRecordOption: NewMatchProfile.optionsList.instanceHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C399081 submatch match profile 2_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C399081 1-to-1 mirror matches job profile_${getRandomPostfix()}`,
    };
    const calloutMessage = `The job profile "${jobProfile.profileName}" was successfully created`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C399081 Verify the ability to create job profile with the same matches in different sequences (folijet)',
      { tags: ['criticalPath', 'folijet', 'C399081'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );

        MatchProfileView.duplicate();
        NewMatchProfile.fillName(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewMatchProfile.saveAndClose();
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );

        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[2].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );

        cy.wait(2000);
        MatchProfileView.duplicate();
        cy.wait(2000);
        NewMatchProfile.fillName(collectionOfMatchProfiles[3].matchProfile.profileName);
        NewMatchProfile.saveAndClose();
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        NewJobProfile.linkMatchProfileForSubMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches('Default - Create instance');
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName, 1);
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
          6,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForSubMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches('Default - Create instance');
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        JobProfiles.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
