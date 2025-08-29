import TopMenu from '../../../support/fragments/topMenu';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';

describe('fse-data-export - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.dataExportPath,
      waiter: ExportFileHelper.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195288 - verify that data-export module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-export'] },
    () => {
      ExportFileHelper.waitLoading();
    },
  );
});

describe('fse-data-export - UI (data manipulation)', () => {
  const fileName = `autoTestFileFse${getRandomPostfix()}.csv`;
  const item = {
    instanceName: `testFseAqa_${getRandomPostfix()}`,
    itemBarcode: generateItemBarcode(),
  };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    const instanceID = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    FileManager.createFile(`cypress/fixtures/${fileName}`, instanceID);
    cy.loginAsAdmin({
      path: TopMenu.dataExportPath,
      waiter: DataExportLogs.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195471 - verify data-export job for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'data-export', 'toBeFixed'] },
    () => {
      ExportFileHelper.uploadFile(fileName);
      ExportFileHelper.exportWithDefaultJobProfile(fileName);

      // collect expected results and verify actual result
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then((interception) => {
        const job = interception.response.body.jobExecutions[0];
        const resultFileName = job.exportedFiles[0].fileName;
        const recordsCount = job.progress.total;
        const jobId = job.hrId;

        DataExportResults.verifySuccessExportResultCells(
          resultFileName,
          recordsCount,
          jobId,
          Cypress.env('diku_login'),
        );
      });
    },
  );

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });
});
