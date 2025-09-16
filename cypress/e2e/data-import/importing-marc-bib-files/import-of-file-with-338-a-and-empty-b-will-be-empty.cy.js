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
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const testData = {
      filePath: 'marcBibFileForC844846.mrc',
      marcFileName: `C844846 marcFile${getRandomPostfix()}.mrc`,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
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
      'C844846 Import of file with 338 with $a and empty $b will be empty (folijet)',
      { tags: ['extendedPath', 'folijet', 'C844846'] },
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
        InstanceRecordView.verifyInstanceFormat('No value set-');
      },
    );
  });
});
