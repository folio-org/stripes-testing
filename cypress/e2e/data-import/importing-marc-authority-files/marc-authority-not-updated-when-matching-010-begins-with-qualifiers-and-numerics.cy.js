import { Record } from 'marcjs';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  MATCH_PROFILE_QUALIFIER_TYPES,
  RECORD_STATUSES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities, {
  defaultLDR,
  valid008ValuesString,
} from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const controlCreate = `${randomNDigitNumber(11)}`;
    const controlIncoming = `${randomNDigitNumber(12)}`;
    const randomDigits = `1538564${randomNDigitNumber(11)}`;
    const letterPrefix = getRandomLetters(5);
    const prefixedValue = `${letterPrefix}${randomDigits}`;
    const leadingSpacesPrefixedValue = `  ${prefixedValue}`;
    const originalHeadingValue = `AT_C1538564_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${originalHeadingValue} UPDATED`;

    const editedCreateFileName = `AT_C1538564_CreateFile_${randomPostfix}.mrc`;
    const editedIncomingFileName = `AT_C1538564_IncomingFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538564 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538564 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1538564 MP MARC Authority 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      incomingQualifier: {
        comparisonPart: 'NUMERICS_ONLY',
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: letterPrefix,
      },
      existingQualifier: {
        comparisonPart: 'NUMERICS_ONLY',
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: letterPrefix,
      },
    };
    const jobProfile = { profileName: `AT_C1538564 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1538564_');

        let updateActionProfileId;
        let matchProfileId;

        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
          .then((apResponse) => {
            updateActionProfileId = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            );
          })
          .then((mpResponse) => {
            matchProfileId = mpResponse.body.id;
            return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfileId,
              updateActionProfileId,
            );
          });

        DataImport.createMarcFile({
          fileName: editedCreateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: controlCreate },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${originalHeadingValue}` },
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${prefixedValue}` },
          ],
        });

        // Build with marcjs directly - createMarcFile trims the leading spaces required for this test.
        const incomingRecord = new Record();
        incomingRecord.leader = defaultLDR.split('\\').join(' ');
        incomingRecord.append(['001', controlIncoming]);
        incomingRecord.append(['008', valid008ValuesString.split('\\').join(' ')]);
        incomingRecord.append(['100', '1 ', 'a', updatedHeadingValue]);
        incomingRecord.append(['010', '  ', 'a', leadingSpacesPrefixedValue]);
        FileManager.createFile(
          `cypress/fixtures/${editedIncomingFileName}`,
          incomingRecord.as('iso2709'),
        );

        // Seed the original authority record via API import
        DataImport.uploadFileViaApi(
          editedCreateFileName,
          editedCreateFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        );
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiDataImportSettingsManage,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
          ],
        );
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedCreateFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedIncomingFileName}`);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(originalHeadingValue);
    });

    it(
      'C1538564 MARC authority record is not updated when matching on 010 $a using Begins with qualifier and Numerics only (promin)',
      { tags: ['extendedPath', 'promin', 'C1538564'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows the seeded 010 $a value
        MarcAuthorities.searchBeats(originalHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(randomDigits);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file with the Update-or-create job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedIncomingFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "No action"
        Logs.waitFileIsImported(editedIncomingFileName);
        Logs.checkJobStatus(editedIncomingFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedIncomingFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.NO_ACTION, columnName);
        });

        // Step 6: searching by the shared base heading returns original record
        // and not an updated version
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBeats(originalHeadingValue);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.verifyRecordFound(originalHeadingValue);
        MarcAuthorities.searchBeats(updatedHeadingValue);
        MarcAuthorities.verifyEmptySearchResults(updatedHeadingValue);
      },
    );
  });
});
