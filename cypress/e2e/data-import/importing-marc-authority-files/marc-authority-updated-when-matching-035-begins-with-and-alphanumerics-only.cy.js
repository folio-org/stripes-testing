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
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `1505061${randomNDigitNumber(11)}`;
    const qualifierPrefix = '(OCoLC)';
    // Both existing 035 occurrences begin with the qualifier prefix, so the qualifier alone
    // doesn't disambiguate between them - only the first also exact-matches the incoming value
    // once "Alphanumerics only" strips non-alphanumeric characters (parentheses, spaces) from both
    const matchingOclcValue = `${qualifierPrefix}ocm${randomDigits}`;
    const nonMatchingOclcValue = `${qualifierPrefix}ocn${randomNDigitNumber(11)}`;
    // Same letters/digits as matchingOclcValue, but with internal spaces - only exact-matches
    // once whitespace/punctuation is stripped by "Alphanumerics only"
    const incomingOclcValue = `${qualifierPrefix} ocm ${randomDigits}`;
    const baseHeadingValue = `AT_C1505061_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    const editedCreateFileName = `AT_C1505061_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1505061_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1505061 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1505061 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1505061 MP MARC Authority 035 $a ${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // Symmetric: both a "Begins with" qualifier and "Alphanumerics only" configured on both sides
      qualifier: {
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: qualifierPrefix,
        comparisonPart: 'ALPHANUMERICS_ONLY',
      },
    };
    const jobProfile = { profileName: `AT_C1505061 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1505061_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 035 $a with both a
        // "Begins with" qualifier and "Alphanumerics only" configured on both sides
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

        // Build both files from scratch - no need for a reusable binary template here, since
        // these are freshly generated records, not edits of an existing/exported one. The seed
        // record gets a SECOND 035 occurrence that begins with the qualifier prefix too but has
        // different letters/digits, so only the first is the actual match
        DataImport.createMarcFile({
          fileName: editedCreateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: randomDigits },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${baseHeadingValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${matchingOclcValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${nonMatchingOclcValue}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: editedUpdateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: `${randomDigits}1` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${updatedHeadingValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${incomingOclcValue}` },
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
      'C1505061 MARC authority record is updated when matching on 035 $a with both a "Begins with" qualifier and "Alphanumerics only" configured (promin)',
      { tags: ['extendedPath', 'promin', 'C1505061'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows both seeded 035 $a values
        MarcAuthorities.searchBeats(baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(matchingOclcValue);
        MarcAuthority.contains(nonMatchingOclcValue);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (035 $a matches only the first existing occurrence
        // once whitespace/punctuation is stripped) with the Update job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - the qualifier plus
        // "Alphanumerics only" identify the matching occurrence, so the record is updated, not
        // duplicated
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
