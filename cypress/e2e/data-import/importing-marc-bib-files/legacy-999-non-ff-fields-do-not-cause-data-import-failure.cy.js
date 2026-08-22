import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceId;
    const instanceTitle = 'AT_C350656_MarcBibInstance';
    const marcFileName = 'marcBibFileForC350656.mrc';
    const uploadedFileName = `C350656 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const original999FieldContent =
      '$a SC LVF M698 pt.1 $w DEWEYSAN $c 1 $i 39151009428455 $d 4/22/1996 $l L-SPCOLL-A $m LEHIGH $r N $s Y $t ROOM-USE $u 5/25/1995';

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.deleteInstanceByTitleViaApi('C350656_');

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        if (instanceId) InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C350656 Legacy 999 (non-ff) fields cause data import failure (promin)',
      { tags: ['extendedPath', 'promin', 'C350656'] },
      () => {
        // Step 1: Upload MARC Bib file containing a 999 non-ff field
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();

        // Step 2: Select Default - Create instance and SRS MARC Bib job profile
        JobProfiles.search(jobProfileToRun);

        // Step 3: Run import; verify import starts
        JobProfiles.runImportFile();

        // Steps 4-5: Wait for completion; open log and verify created statuses
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(uploadedFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(instanceTitle);

        // Steps 6-7: Get imported instance HRID and UUID from API; search in Inventory by HRID
        cy.getToken(user.username, user.password);
        cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
          (instance) => {
            instanceId = instance.id;

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.searchInstanceByHRID(instance.hrid);
            InventoryInstances.selectInstanceById(instanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            // Step 8: Open the instance and view MARC source record
            InstanceRecordView.waitLoading();
            InstanceRecordView.viewSource();
            InventoryViewSource.waitLoading();

            // Step 9: Verify original 999 non-ff field is still present with its original data
            InventoryViewSource.checkRowExistsWithTagAndValue(
              '999',
              `     ${original999FieldContent}`,
            );

            // Step 10: Verify new 999 ff field was added at the bottom with instance UUID in $i
            InventoryViewSource.checkRowExistsWithTagAndValue('999', `f f  $i ${instanceId} $s`);
          },
        );
      },
    );
  });
});
