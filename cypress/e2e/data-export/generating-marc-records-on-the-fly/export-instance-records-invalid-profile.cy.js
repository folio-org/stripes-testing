import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const folioInstance = {
  title: `AT_C350407_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};
const fileName = `AT_C350407_autoTestFile${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;
        folioInstance.id = InventoryInstances.createInstanceViaApi(
          folioInstance.title,
          folioInstance.itemBarcode,
        );
        cy.getInstanceById(folioInstance.id).then((instanceData) => {
          instanceData.editions = ['Edition 1', 'Edition 2'];
          instanceData.languages = ['eng'];
          instanceData.publicationFrequency = ['Monthly'];
          instanceData.publicationRange = ['4'];

          cy.updateInstance(instanceData);

          FileManager.createFile(`cypress/fixtures/${fileName}`, folioInstance.id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    it(
      'C350407 Verify that a user cannot trigger the DATA EXPORT using invalid job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C350407'] },
      () => {
        ExportFileHelper.uploadFile(fileName);
        ExportFileHelper.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const resultFileName = jobData.exportedFiles[0].fileName;
          const recordsCount = jobData.progress.total;
          const jobId = jobData.hrId;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );
          cy.getUserToken(user.username, user.password);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.clickFileNameFromTheList(resultFileName);
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR Record not found: ${folioInstance.id}`),
          );
        });
      },
    );
  });
});
