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
    const randomDigits = `1538582${randomNDigitNumber(11)}`;
    // "Ends with" qualifier value is the bare digit suffix; the 035 $a itself carries the
    // "(OCoLC)" prefix in front of it
    const oclcValue = `(OCoLC)${randomDigits}`;
    const title = `AT_C1538582_MarcBibInstance_${randomPostfix}`;
    const titleUpdated = `${title} UPDATED`;

    const createFileName = `AT_C1538582_CreateFile_${randomPostfix}.mrc`;
    const updateFileName = `AT_C1538582_UpdateFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1538582 FMP MARC Bib Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1538582 AP MARC Bib Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const qualifier = {
      qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.ENDS_WITH,
      qualifierValue: randomDigits,
    };
    const matchProfile = {
      profileName: `AT_C1538582 MP MARC Bib 035 $a Qualifier ${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      qualifier,
    };
    const jobProfile = { profileName: `AT_C1538582 JP MARC Bib Update ${randomPostfix}` };

    const testData = { user: {} };
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C1538582_');
        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 035 $a with an "Ends
        // with" qualifier on both sides and no "only compare part of the value"
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
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcValue}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: updateFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcValue}` },
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
      'C1538582 MARC bib 035 $a on 035 $a — Ends with qualifier only, no compare-part: qualifier matches, record Updated (promin)',
      { tags: ['criticalPath', 'promin', 'C1538582'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        // Step 3: the seeded record's MARC source shows the 035 $a value from the create file
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('035', oclcValue);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 4: import the update file with the job profile from preconditions
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(updateFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Instance both show "Updated" - the "Ends with"
        // qualifier correctly matched, so the existing record was updated, not duplicated
        Logs.waitFileIsImported(updateFileName);
        Logs.checkJobStatus(updateFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(updateFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 6: the same instance's MARC source now shows the updated title
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', titleUpdated);
        InventoryViewSource.checkRowExistsWithTagAndValue('035', oclcValue);
      },
    );
  });
});
