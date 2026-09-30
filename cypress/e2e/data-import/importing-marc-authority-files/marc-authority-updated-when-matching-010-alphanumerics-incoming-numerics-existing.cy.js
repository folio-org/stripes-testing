import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
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
    const randomDigits = `1538560${randomNDigitNumber(11)}`;
    const letterPrefix = getRandomLetters(5);
    // Letter + internal space + digits - "Numerics only" on the existing side strips both down
    // to the bare digits
    const seed010Value = `${letterPrefix} ${randomDigits}`;
    // Bare digits - "Alphanumerics only" on the incoming side has nothing to strip, so it stays
    // as-is; both sides end up comparing the same digit string
    const update010Value = randomDigits;
    const baseHeadingValue = `AT_C1538560_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    const editedCreateFileName = `AT_C1538560_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1538560_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538560 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538560 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1538560 MP MARC Authority 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // No qualifier ("Use a qualifier" not enabled on either side) - just different
      // "Only compare part of the value" settings per side
      incomingQualifier: { comparisonPart: 'ALPHANUMERICS_ONLY' },
      existingQualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const jobProfile = { profileName: `AT_C1538560 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1538560_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 010 $a with
        // "Alphanumerics only" on the incoming side and "Numerics only" on the existing side
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
          .then((apResponse) => {
            const apId = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((mpResponse) => NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              mpResponse.body.id,
              apId,
            ));
          });

        DataImport.createMarcFile({
          fileName: editedCreateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: randomDigits },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${baseHeadingValue}` },
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${seed010Value}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: editedUpdateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: `${randomDigits}1` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${updatedHeadingValue}` },
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${update010Value}` },
          ],
        });

        // Seed the original authority record via API import
        DataImport.uploadFileViaApi(
          editedCreateFileName,
          editedCreateFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          createdAuthorityId = response[0].authority.id;
        });
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
      FileManager.deleteFile(`cypress/fixtures/${editedUpdateFileName}`);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId);
    });

    it(
      'C1538560 MARC authority record is updated when matching on 010 $a with Alphanumerics only (incoming) and Numerics only (existing) configured without a qualifier (promin)',
      { tags: ['extendedPath', 'promin', 'C1538560'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows the seeded 010 $a value
        MarcAuthorities.searchBeats(baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(seed010Value);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (010 $a is the bare digit form) with the Update job
        // profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - both sides normalize
        // to the same digit string, so the record is matched and updated, not duplicated
        Logs.waitFileIsImported(editedUpdateFileName);
        Logs.checkJobStatus(editedUpdateFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedUpdateFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 6: searching by the stable base heading returns exactly one record (proves no
        // duplicate was created), and that record's heading now shows the "UPDATED" suffix
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBeats(baseHeadingValue);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(updatedHeadingValue);
      },
    );
  });
});
