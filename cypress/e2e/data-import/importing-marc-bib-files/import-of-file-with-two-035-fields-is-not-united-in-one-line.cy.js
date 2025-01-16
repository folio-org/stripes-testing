import {
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
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const testData = {
      filePath: 'marcBibFileForC594484.mrc',
      marcFileName: `C594484 marcFile${getRandomPostfix()}.mrc`,
      identifirs: [
        {
          type: 'OCoLC',
          value: '(OCoLC)85820197',
        },
        {
          type: 'OCoLC-M',
          value: '(OCoLC-M)858201973344',
        },
      ],
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C594484 Import of file with two 035 fields is not united in one line (folijet)',
      { tags: ['criticalPath', 'folijet', 'C594484'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(testData.filePath, testData.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFileName);
        Logs.checkJobStatus(testData.marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InstanceRecordView.waitLoading();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
        InstanceRecordView.waitLoading();
        InstanceRecordView.viewSource();
        InstanceRecordView.verifySrsMarcRecord();
        InventoryViewSource.contains(`035\t   \t$a ${testData.identifirs[0].value}`);
        InventoryViewSource.contains(`035\t   \t$a ${testData.identifirs[1].value}`);
      },
    );
  });
});
