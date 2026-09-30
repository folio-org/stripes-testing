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
    const searchOption = 'Keyword';
    const letterPrefix = getRandomLetters(9);
    const randomDigits = `1528150${randomNDigitNumber(9)}`;
    // Letters + an internal space - stripped down to the same digits by "Numerics only" on the
    // existing side
    const seed016Value = `${letterPrefix} ${randomDigits}`;
    // Same letters + same digits, no space - stripped down to the same digits by "Numerics only"
    // on the incoming side. Only matches because both sides ignore letters/whitespace; the two
    // raw strings differ
    const update016Value = `${letterPrefix}${randomDigits}`;
    const baseHeadingValue = `AT_C1528150_MarcAuthority_${randomPostfix}`;
    const updatedHeadingValue = `${baseHeadingValue} UPDATED`;

    // Reused as a template - editFields/addFields overwrite by tag regardless of the template's
    // own content; this barebone template has no 010/016, so 016 is appended via addFields
    const templateFileName = 'marcAuthFileForC1528150.mrc';
    const editedCreateFileName = `AT_C1528150_CreateFile_${randomPostfix}.mrc`;
    const editedUpdateFileName = `AT_C1528150_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1528150 FMP MARC Authority Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1528150 AP MARC Authority Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C1528150 MP MARC Authority 016 $a ${randomPostfix}`,
      incomingRecordFields: { field: '016', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '016', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      // Symmetric: "Numerics only" configured on both sides
      qualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const jobProfile = { profileName: `AT_C1528150 JP MARC Authority Update ${randomPostfix}` };

    const testData = { user: {} };
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1528150_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 016 $a with
        // "Numerics only" configured on both sides
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

        // Prepare both files from the template - placeholders replaced with unique 001/100
        // content, and a new 016 field appended (the template has none); the update file's
        // heading is the same base value with "UPDATED" appended
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedCreateFileName, {
          editFields: [
            { tag: '001', content: randomDigits },
            { tag: '100', content: `$a ${baseHeadingValue}` },
          ],
          addFields: [{ tag: '016', indicators: ['\\', '\\'], content: `$a ${seed016Value}` }],
        });
        DataImport.editMarcFieldsInAllRecords(templateFileName, editedUpdateFileName, {
          editFields: [
            { tag: '001', content: randomDigits },
            { tag: '100', content: `$a ${updatedHeadingValue}` },
          ],
          addFields: [{ tag: '016', indicators: ['\\', '\\'], content: `$a ${update016Value}` }],
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
      'C1528150 MARC authority record is updated when matching on 016 (field without index) $a with "Numerics only" and no qualifier configured (promin)',
      { tags: ['extendedPath', 'promin', 'C1528150'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // Step 3: original authority record's MARC source shows the seeded 016 $a value
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(seed016Value);
        MarcAuthorities.clickResetAndCheck();

        // Step 4: import the incoming file (016 $a differs by letters and the missing space)
        // with the Update job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(editedUpdateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Authority both show "Updated" - "Numerics only" on
        // both sides ignores the letters/whitespace differences, so the record is matched and
        // updated, not duplicated
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
        // duplicate was created), and that record now shows the updated 016 $a and heading
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(searchOption, baseHeadingValue);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.contains(update016Value);
        MarcAuthority.contains(updatedHeadingValue);
      },
    );
  });
});
