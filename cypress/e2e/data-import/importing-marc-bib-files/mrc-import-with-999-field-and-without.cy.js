import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const instanceTitle = 'Mistapim in Cambodia [microform]. Photos. by the author.';
    const error =
      '{"error":"A new Instance was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';
    const nameMarcFileForCreate = `C359012 autotestFile.${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
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
        cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C359012 Checking the import of the MARC Bib file, that has records with 999 ff and without the 999 ff field (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC359012.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
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
        FileDetails.verifyErrorMessage(error);
      },
    );
  });
});
