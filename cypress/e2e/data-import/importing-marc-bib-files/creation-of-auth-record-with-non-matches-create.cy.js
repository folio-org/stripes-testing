import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const unique010$a = `5003${randomFourDigitNumber()}`;
    const filePathToUpload = 'marcAuthFileC423578.mrc';
    const modifiedMarcFile = `C423578 autotestEditedFile${getRandomPostfix()}.mrc`;
    const firstFileName = `C423578 autotestFile${getRandomPostfix()}.mrc`;
    const secondFileName = `C423578 autotestFile${getRandomPostfix()}.mrc`;
    const defaultActionProfileName = 'Default - Create MARC Authority';
    const matchProfile = {
      profileName: `C423578 010$a authority match${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C423578 Creating authority via non-match${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      // change 010$a to unique
      DataImport.editMarcFile(filePathToUpload, modifiedMarcFile, ['50033023'], [unique010$a]);

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFile}`);
      cy.getAdminToken().then(() => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C423578Holiday, Billie"',
        }).then((records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        });
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      });
    });

    it(
      'C423578 Verify the creation of Authority record with non-matches create (folijet)',
      { tags: ['smoke', 'folijet', 'C423578', 'shiftLeft'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        cy.wait(1500);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForNonMatches(defaultActionProfileName);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(modifiedMarcFile, firstFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(firstFileName);
        Logs.checkJobStatus(firstFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((column) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, column);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkAuthorityQuantityInSummaryTable('1');
        FileDetails.openAuthority();
        MarcAuthorities.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(modifiedMarcFile, secondFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(secondFileName);
        Logs.checkJobStatus(secondFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((column) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.NO_ACTION, column);
        });
      },
    );
  });
});
