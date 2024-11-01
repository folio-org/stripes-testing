import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const instanceTitle = 'Mistapim in Cambodia [microform]. Photos. by the author.';
    const error =
      'org.folio.processing.exceptions.EventProcessingException: A new Instance was not created because the incoming record already contained a 999ff$s or 999ff$i field';
    const nameMarcFileForCreate = `C359012 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C359012 Checking the import of the MARC Bib file, that has records with 999 ff and without the 999 ff field (folijet)',
      { tags: ['criticalPath', 'folijet', 'C359012'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC359012.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkJobStatus(nameMarcFileForCreate, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(nameMarcFileForCreate);
        // check that "SRS MARC" and "Instance" were created for record, that not contains 999 ff field
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');
        FileDetails.checkItemsStatusesInResultList(1, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.CREATED,
        ]);
        // check that "SRS MARC" and "Instance" were not created for record, that contain 999 ff field
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 2);
        FileDetails.checkErrorQuantityInSummaryTable('1', 3);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.ERROR,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.openJsonScreen('The Journal of ecclesiastical history.');
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(error);
      },
    );
  });
});
