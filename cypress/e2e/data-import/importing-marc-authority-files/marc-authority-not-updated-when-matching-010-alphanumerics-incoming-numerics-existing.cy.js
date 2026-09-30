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
    const randomDigits = `1538561${randomNDigitNumber(11)}`;
    const letterPrefix = getRandomLetters(5);
    // Letter + digits + a TRAILING space - byte-identical on both sides. Incoming-side
    // "Alphanumerics only" only strips the space, keeping the letter ("n12345"); existing-side
    // "Numerics only" strips both the letter and the space ("12345") - the two normalized values
    // differ even though the raw values are identical, so no match occurs
    const sameRawValue = `${letterPrefix}${randomDigits} `;
    const originalHeadingValue = `AT_C1538561_MarcAuthority_${randomPostfix}`;
    const duplicateHeadingValue = `${originalHeadingValue} DUPLICATE`;

    const editedCreateFileName = `AT_C1538561_CreateFile_${randomPostfix}.mrc`;
    const editedIncomingFileName = `AT_C1538561_IncomingFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538561 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538561 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1538561 MP MARC Authority 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // No qualifier ("Use a qualifier" not enabled on either side) - just different
      // "Only compare part of the value" settings per side
      incomingQualifier: { comparisonPart: 'ALPHANUMERICS_ONLY' },
      existingQualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const jobProfile = { profileName: `AT_C1538561 JP MARC Authority Update ${randomPostfix}` };
    const defaultCreateAuthorityActionProfileName = 'Default - Create MARC Authority';

    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1538561_');

        // Job profile chain: FMP -> AP (match -> update) plus a NON_MATCH -> Create action, using
        // the system default "Default - Create MARC Authority" action profile - this is what
        // produces the duplicate when the asymmetric normalization prevents a match
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
            return SettingsActionProfiles.getActionProfilesViaApi({
              query: `name="${defaultCreateAuthorityActionProfileName}"`,
            });
          })
          .then(({ actionProfiles }) => {
            const defaultCreateActionProfileId = actionProfiles[0].id;
            return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfileAndNonMatchActionProfileViaApi(
              jobProfile.profileName,
              matchProfileId,
              updateActionProfileId,
              defaultCreateActionProfileId,
            );
          });

        // Build both files with the byte-identical raw 010 $a value; only the heading differs, so
        // the two resulting records (if a duplicate is created) can be told apart
        DataImport.createMarcFile({
          fileName: editedCreateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: randomDigits },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${originalHeadingValue}` },
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${sameRawValue}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: editedIncomingFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: `${randomDigits}1` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${duplicateHeadingValue}` },
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${sameRawValue}` },
          ],
        });

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
      // Both the original and the duplicate share the same base heading, so a single title-based
      // delete catches both, regardless of how many records ended up existing
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(originalHeadingValue);
    });

    it(
      'C1538561 MARC authority record is not updated when matching on 010 $a with Alphanumerics only (incoming) and Numerics only (existing) (promin)',
      { tags: ['extendedPath', 'promin', 'C1538561'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows the seeded 010 $a value
        MarcAuthorities.searchBeats(originalHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(sameRawValue);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (byte-identical 010 $a, but normalizes differently on
        // each side) with the Update-or-create job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedIncomingFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "No action" - the asymmetric
        // normalization means the two sides never produce equal values, so the match fails
        Logs.waitFileIsImported(editedIncomingFileName);
        Logs.checkJobStatus(editedIncomingFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedIncomingFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // Step 6: searching by the shared base heading now returns two records - the original
        // (unchanged) and a newly created duplicate from the non-matched incoming record
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBeats(originalHeadingValue);
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.verifyRecordFound(duplicateHeadingValue);
        MarcAuthorities.selectTitle(originalHeadingValue);
        MarcAuthority.contains(sameRawValue);
      },
    );
  });
});
