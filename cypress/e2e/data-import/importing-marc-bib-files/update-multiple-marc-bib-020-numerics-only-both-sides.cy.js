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
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
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
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    // Same base digits for both ISBNs, differing only in the last digit (matching TestRail's
    // "...588008" vs "...588009") - proves the match doesn't cross-match the two near-identical
    // records
    const isbnBase = `${randomNDigitNumber(12)}`;
    const isbn1 = `${isbnBase}8`;
    const isbn2 = `${isbnBase}9`;
    // Hyphenated ISBN - "Numerics only" strips the hyphens before comparison
    const create020Value1 = `${isbn1.slice(0, 3)}-${isbn1.slice(3, 4)}-${isbn1.slice(4, 7)}-${isbn1.slice(7, 12)}-${isbn1.slice(12, 13)}`;
    // Bare digits - already numerics-only, matches create020Value1 once hyphens are stripped
    const update020Value1 = isbn1;
    // Letter prefix + internal space - "Numerics only" strips both before comparison
    const create020Value2 = `n ${isbn2}`;
    // Different letter prefix, no space - still strips down to the same bare digits as
    // create020Value2, proving normalization ignores any non-numeric characters
    const update020Value2 = `s${isbn2}`;
    const title1 = `AT_C1538588_MarcBibInstance1_${randomPostfix}`;
    const title1Updated = `${title1} UPDATED`;
    const title2 = `AT_C1538588_MarcBibInstance2_${randomPostfix}`;
    const title2Updated = `${title2} UPDATED`;

    const createRecord1FileName = `AT_C1538588_CreateRecord1_${randomPostfix}.mrc`;
    const createRecord2FileName = `AT_C1538588_CreateRecord2_${randomPostfix}.mrc`;
    const createFileName = `AT_C1538588_CreateFile_${randomPostfix}.mrc`;
    const updateRecord1FileName = `AT_C1538588_UpdateRecord1_${randomPostfix}.mrc`;
    const updateRecord2FileName = `AT_C1538588_UpdateRecord2_${randomPostfix}.mrc`;
    const updateFileName = `AT_C1538588_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538588 FMP MARC Bib Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538588 AP MARC Bib Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `AT_C1538588 MP MARC Bib 020 $a ${randomPostfix}`,
      incomingRecordFields: { field: '020', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '020', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      // No qualifier on either side - "Only compare part of the value" (Numerics only) on
      // both sides
      qualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const jobProfile = { profileName: `AT_C1538588 JP MARC Bib Update ${randomPostfix}` };

    const testData = { user: {} };
    let instanceId1;
    let instanceId2;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C1538588_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 020 $a with
        // "Numerics only" comparison part on both sides, no qualifier
        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
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

        // Build the 2-record create file and the 2-record update file by concatenating two
        // single-record files each - createMarcFile only writes one record at a time
        DataImport.createMarcFile({
          fileName: createRecord1FileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '020', indicators: ['\\', '\\'], content: `$a ${create020Value1}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title1}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: createRecord2FileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '020', indicators: ['\\', '\\'], content: `$a ${create020Value2}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title2}` },
          ],
        });
        FileManager.readFile(`cypress/fixtures/${createRecord1FileName}`).then((record1Content) => {
          FileManager.readFile(`cypress/fixtures/${createRecord2FileName}`).then(
            (record2Content) => {
              FileManager.createFile(
                `cypress/fixtures/${createFileName}`,
                record1Content + record2Content,
              );
            },
          );
        });

        DataImport.createMarcFile({
          fileName: updateRecord1FileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '020', indicators: ['\\', '\\'], content: `$a ${update020Value1}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title1Updated}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: updateRecord2FileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '020', indicators: ['\\', '\\'], content: `$a ${update020Value2}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title2Updated}` },
          ],
        });
        FileManager.readFile(`cypress/fixtures/${updateRecord1FileName}`).then((record1Content) => {
          FileManager.readFile(`cypress/fixtures/${updateRecord2FileName}`).then(
            (record2Content) => {
              FileManager.createFile(
                `cypress/fixtures/${updateFileName}`,
                record1Content + record2Content,
              );
            },
          );
        });

        // Seed both original bib records via API import
        DataImport.uploadFileViaApi(
          createFileName,
          createFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId1 = response[0].instance.id;
          instanceId2 = response[1].instance.id;
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
            CapabilitySets.uiInventoryInstanceView,
            CapabilitySets.uiQuickMarcQuickMarcEditorView,
          ],
        );
      });
    });

    after('Delete test data', () => {
      [
        createRecord1FileName,
        createRecord2FileName,
        createFileName,
        updateRecord1FileName,
        updateRecord2FileName,
        updateFileName,
      ].forEach((fileName) => FileManager.deleteFile(`cypress/fixtures/${fileName}`));
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      if (instanceId1) InventoryInstance.deleteInstanceViaApi(instanceId1);
      if (instanceId2) InventoryInstance.deleteInstanceViaApi(instanceId2);
    });

    it(
      'C1538588 Update multiple MARC bib 020 $a on 020 $a when Match profile has configured Numerics only both sides, field without index: normalized values match (promin)',
      { tags: ['criticalPath', 'promin', 'C1538588'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        // Step 3: the 1st seeded record's MARC source shows its create-file 020 $a value
        InventoryInstances.searchByTitle(instanceId1);
        InventoryInstances.selectInstanceById(instanceId1);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('020', create020Value1);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 4: the 2nd seeded record's MARC source shows its create-file 020 $a value
        InventoryInstances.searchByTitle(instanceId2);
        InventoryInstances.selectInstanceById(instanceId2);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('020', create020Value2);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 5: import the 2-record update file with the job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(updateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 6: import completes; SRS and Instance show "Updated" for both records - the
        // numerics-only normalization matched despite differing hyphens/prefixes/spacing
        Logs.waitFileIsImported(updateFileName);
        Logs.checkJobStatus(updateFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(updateFileName);
        [0, 1].forEach((rowIndex) => {
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName, rowIndex);
          });
        });

        // Step 7: the 1st instance's MARC source now shows the updated title and the 020 $a
        // value as it was written from the update file (bare digits, no hyphens)
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', title2Updated);
        InventoryViewSource.checkRowExistsWithTagAndValue('020', update020Value2);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 8: the 2nd instance's MARC source now shows the updated title and the 020 $a
        // value as it was written from the update file (different letter prefix, no space)
        InventoryInstances.searchByTitle(instanceId1);
        InventoryInstances.selectInstanceById(instanceId1);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyInstanceTitle(title1Updated);
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', title1Updated);
        InventoryViewSource.checkRowExistsWithTagAndValue('020', update020Value1);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
      },
    );
  });
});
