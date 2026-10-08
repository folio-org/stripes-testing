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
    const randomDigits = `1538585${randomNDigitNumber(11)}`;
    const valuePrefix = 'a';
    // Letter prefix + digits - "Numerics only" on the existing side strips the letter before
    // comparison
    const seed010Value = `${valuePrefix}${randomDigits}`;
    // Bare digits - no comparison part needed on the incoming side, it already matches the
    // existing side's normalized (digits-only) form
    const update010Value = randomDigits;
    const title = `AT_C1538585_MarcBibInstance_${randomPostfix}`;
    const titleUpdated = `${title} UPDATED`;

    const createFileName = `AT_C1538585_CreateFile_${randomPostfix}.mrc`;
    const updateFileName = `AT_C1538585_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538585 FMP MARC Bib Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538585 AP MARC Bib Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `AT_C1538585 MP MARC Bib 010 $a ${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      // No qualifier on either side - "Only compare part of the value" (Numerics only) on
      // the existing side only
      existingQualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const jobProfile = { profileName: `AT_C1538585 JP MARC Bib Update ${randomPostfix}` };

    const testData = { user: {} };
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C1538585_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 010 $a with
        // "Numerics only" comparison part on the existing side only, no qualifier
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

        DataImport.createMarcFile({
          fileName: createFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${seed010Value}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: updateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '010', indicators: ['\\', '\\'], content: `$a ${update010Value}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${titleUpdated}` },
          ],
        });

        // Seed the original bib record via API import
        DataImport.uploadFileViaApi(
          createFileName,
          createFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId = response[0].instance.id;
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
      FileManager.deleteFile(`cypress/fixtures/${createFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${updateFileName}`);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      if (instanceId) InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C1538585 MARC bib 010 $a on 010 $a — no compare-part incoming, Numerics only existing, no qualifier: normalized values match, record Updated (promin)',
      { tags: ['criticalPath', 'promin', 'C1538585'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        // Step 3: the seeded record's MARC source shows the 010 $a value from the create file
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('010', seed010Value);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 4: import the update file with the job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(updateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Instance both show "Updated" - the existing value
        // normalized (letter stripped) to match the incoming bare-digit value, so the record
        // was updated, not duplicated
        Logs.waitFileIsImported(updateFileName);
        Logs.checkJobStatus(updateFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(updateFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 6: the same instance's MARC source now shows the updated title and the 010 $a
        // value as it was written from the update file (bare digits, no letter prefix)
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', titleUpdated);
        InventoryViewSource.checkRowExistsWithTagAndValue('010', update010Value);
      },
    );
  });
});
