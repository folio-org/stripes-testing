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
    // Same OCLC number on both existing bibs - this is what makes the first-level match
    // ambiguous (both candidates match), which the nested static-value submatch must resolve
    const oclcValue = `(OCoLC)${randomNDigitNumber(11)}`;
    const name1 = 'C1554424 Doe, John.';
    const name2 = 'C1554424 Smith, Jane.';
    const title1 = `AT_C1554424_MarcBibInstance1_${randomPostfix}`;
    const title2 = `AT_C1554424_MarcBibInstance2_${randomPostfix}`;
    // The incoming file's title, as if exported from bib 1 and edited - this is what bib 2
    // should end up with after the update, since only bib 2 (Smith, Jane.) passes the submatch
    const incomingTitle = `${title1} Updated title via DI`;

    const createFileName1 = `AT_C1554424_CreateFile1_${randomPostfix}.mrc`;
    const createFileName2 = `AT_C1554424_CreateFile2_${randomPostfix}.mrc`;
    const incomingFileName = `AT_C1554424_IncomingFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C1554424 FMP MARC Bib Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1554424 AP MARC Bib Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile1 = {
      profileName: `AT_C1554424 MP Match on OCLC number ${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      qualifier: { comparisonPart: 'NUMERICS_ONLY' },
    };
    const matchProfile2Name = `AT_C1554424 MP Static match name in 100 ${randomPostfix}`;
    const jobProfileName = `AT_C1554424 JP Update by OCLC and name submatch ${randomPostfix}`;

    const testData = { user: {} };
    let instanceId1;
    let instanceId2;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceByTitleViaApi('C1554424_');

        // FMP -> AP chain for the "Update MARC Bib" action
        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
          .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
          .then((apResponse) => {
            testData.actionProfileId = apResponse.body.id;
          });

        // Match profile 1: 035 $a on 035 $a, Numerics only both sides
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile1)
          .then((mpResponse) => {
            testData.matchProfile1Id = mpResponse.body.id;
          })
          // Match profile 2: static value "{Smith, Jane.}" against existing 100 $a
          .then(() => NewMatchProfile.createMatchProfileWithStaticValueAndExistingFieldMatchExpressionViaApi({
            profileName: matchProfile2Name,
            incomingStaticValue: `{${name2}}`,
            existingRecordFields: { field: '100', in1: '*', in2: '*', subfield: 'a' },
          }))
          .then(({ body }) => {
            testData.matchProfile2Id = body.id;
          })
          // Job profile: nested matches - Match on OCLC number -> for matches -> Static match
          // on 100 $a -> for matches -> Update MARC Bib
          .then(() => NewJobProfile.createJobProfileWithLinkedNestedMatchAndActionProfilesViaApi(
            jobProfileName,
            testData.matchProfile1Id,
            testData.matchProfile2Id,
            testData.actionProfileId,
          ))
          .then((jobProfileId) => {
            testData.jobProfileId = jobProfileId;
          });

        // Two existing bibs sharing the same OCLC number, distinguished only by 100 $a
        DataImport.createMarcFile({
          fileName: createFileName1,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcValue}` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${name1}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title1}` },
          ],
        });
        DataImport.createMarcFile({
          fileName: createFileName2,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcValue}` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${name2}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${title2}` },
          ],
        });
        // The incoming record - same OCLC number, title carries the "Updated title via DI" edit
        DataImport.createMarcFile({
          fileName: incomingFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcValue}` },
            { tag: '100', indicators: ['1', '\\'], content: `$a ${name1}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${incomingTitle}` },
          ],
        });

        DataImport.uploadFileViaApi(
          createFileName1,
          createFileName1,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId1 = response[0].instance.id;
        });
        DataImport.uploadFileViaApi(
          createFileName2,
          createFileName2,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId2 = response[0].instance.id;
        });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiInventory,
            CapabilitySets.uiQuickMarcQuickMarcEditor,
            CapabilitySets.uiDataImport,
          ],
        );
      });
    });

    after('Delete test data', () => {
      [createFileName1, createFileName2, incomingFileName].forEach((fileName) => FileManager.deleteFile(`cypress/fixtures/${fileName}`));
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfile1Id);
      SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfile2Id);
      SettingsActionProfiles.deleteActionProfileViaApi(testData.actionProfileId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      if (instanceId1) InventoryInstance.deleteInstanceViaApi(instanceId1);
      if (instanceId2) InventoryInstance.deleteInstanceViaApi(instanceId2);
    });

    // Will FAIL until this is fixed: https://folio-org.atlassian.net/browse/MODINV-1427
    it(
      'C1554424 Record match count decreases when "Static value (submatch only)" condition is applied for MARC bib update (promin)',
      { tags: ['extendedPath', 'promin', 'C1554424'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        // Step 1: upload the incoming file and run the nested-match job profile
        DataImport.uploadFile(incomingFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();

        // Step 2: job summary shows 1 SRS MARC Bib updated
        Logs.waitFileIsImported(incomingFileName);
        Logs.checkJobStatus(incomingFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(incomingFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );

        // Steps 3-4: Instance 2 (Smith, Jane.) passed the static-value submatch and was
        // updated - 245 $a now shows the incoming record's title
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(instanceId2);
        InventoryInstances.selectInstanceById(instanceId2);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', incomingTitle);
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 5: Instance 1 (Doe, John.) did not pass the static-value submatch and was not
        // updated - 245 $a is unchanged
        InventoryInstances.searchByTitle(instanceId1);
        InventoryInstances.selectInstanceById(instanceId1);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.checkRowExistsWithTagAndValue('245', title1);
      },
    );
  });
});
