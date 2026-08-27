import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const csvFileName = `C17099_exportList${randomPostfix}.csv`;
    const exportedMarcFileName = `C17099_exportedMarc${randomPostfix}.mrc`;

    const matchProfile = {
      profileName: `AT_C17099_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.hrid',
    };

    const mappingProfile = { name: `AT_C17099_InstanceMappingProfile_${randomPostfix}` };

    const actionProfile = {
      name: `AT_C17099_InstanceActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };

    const jobProfile = { profileName: `AT_C17099_JobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();

      // Step 1: Create MARC bib instance via API
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        {
          tag: '245',
          content: `$a AT_C17099_MarcBibInstance_${randomPostfix}`,
          indicators: ['1', '1'],
        },
      ])
        .then((instanceId) => {
          testData.instanceId = instanceId;

          cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
            testData.srsId = srsRecord.id;
          });
        })
        .then(() => {
          // Step 2: Create CSV file with instance UUID for Data Export
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
        })
        .then(() => {
          // Step 3: Export the instance as MARC via API and download to fixtures
          ExportFile.exportFileViaApi(csvFileName).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          // Step 4: Create Data Import profiles via API
          NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
                  matchProfile,
                ).then((matchProfileResponse) => {
                  NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                    jobProfile.profileName,
                    matchProfileResponse.body.id,
                    actionProfileResponse.body.id,
                  );
                });
              });
            },
          );
        })
        .then(() => {
          // Step 5: Re-import exported MARC file using update job profile via API
          DataImport.uploadFileViaApi(
            exportedMarcFileName,
            exportedMarcFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      "C17099 Update MARC bib by '.mrc' with 999 ff $s and $i is successful (promin)",
      { tags: ['edgeCases', 'promin', 'C17099'] },
      () => {
        // Step 1: Search for the updated instance by HRID in Inventory
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);

        // Step 2: Open MARC bibliographic source view
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.viewSource();
        InventoryViewSource.waitInstanceLoading();

        // Step 3: Verify 999 ff $i (instanceUUID) and $s (srsUUID) are unchanged after re-import
        InventoryViewSource.checkRowExistsWithTagAndValue('999', `$i ${testData.instanceId}`);
        InventoryViewSource.checkRowExistsWithTagAndValue('999', `$s ${testData.srsId}`);

        // Step 4: Verify only one 999 ff field exists in the MARC source
        InventoryViewSource.verifyRecordNotContainsDuplicatedContent('999', { exactMatch: true });
      },
    );
  });
});
