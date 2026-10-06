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
    const randomDigits = `1505068${randomNDigitNumber(11)}`;
    const qualifierPrefix = '(OCoLC)ocn';
    // Second existing occurrence - begins with the qualifier prefix, so it's the one selected for
    // comparison; also reused as the incoming (unqualified) value
    const matchingOclcValue = `${qualifierPrefix}${randomDigits}`;
    // First existing occurrence - does not begin with the qualifier prefix (different letter), so
    // it's excluded from the comparison
    const nonMatchingExistingValue = `(OCoLC)ocm${randomNDigitNumber(11)}`;
    const baseHeadingValue = `AT_C1505068_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    const editedCreateFileName = `AT_C1505068_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1505068_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1505068 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1505068 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1505068 MP MARC Authority 035 $a ${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // Asymmetric: only the existing side has a "Begins with" qualifier; the incoming side has
      // no qualifier at all
      incomingQualifier: {},
      existingQualifier: {
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: qualifierPrefix,
      },
    };
    const jobProfile = { profileName: `AT_C1505068 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1505068_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 035 $a with a
        // "Begins with" qualifier configured on the existing side only
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

        // Build both files from scratch. The seed record has TWO 035 $a occurrences - only one
        // begins with the qualifier prefix. The incoming record has a single, unqualified value
        DataImport.createMarcFile({
          fileName: editedCreateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: randomDigits },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${baseHeadingValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${nonMatchingExistingValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${matchingOclcValue}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: editedUpdateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
          fields: [
            { tag: '001', content: `${randomDigits}1` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${updatedHeadingValue}` },
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${matchingOclcValue}` },
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
      'C1505068 MARC authority record is updated when matching on 035 $a with a "Begins with" qualifier configured on the existing side only (promin)',
      { tags: ['extendedPath', 'promin', 'C1505068'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows both seeded 035 $a values
        MarcAuthorities.searchBeats(baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(nonMatchingExistingValue);
        MarcAuthority.contains(matchingOclcValue);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (single unqualified 035 $a, matches only the existing
        // occurrence that begins with the qualifier prefix) with the Update job profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - the existing-side
        // "Begins with" qualifier identifies the matching occurrence, so the record is updated,
        // not duplicated
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
