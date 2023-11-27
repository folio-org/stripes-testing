import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const quantityOfItems = '1';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const title = 'No content';
    const instanceTitle = 'Mistapim in Cambodia [microform]. Photos. by the author.';
    const errorMessage =
      '{"error":"A new Instance was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';
    const nameMarcFileForCreate = `C359012 autotestFile${getRandomPostfix()}.mrc`;

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
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
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
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkItemsStatusesInResultList(1, [
          FileDetails.status.created,
          FileDetails.status.created,
        ]);
        // check that "SRS MARC" and "Instance" were not created for record, that contain 999 ff field
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 2);
        FileDetails.checkErrorQuantityInSummaryTable(quantityOfItems, 3);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.error,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessage);
      },
    );
  });
});
