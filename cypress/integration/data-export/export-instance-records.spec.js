import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import TestTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import DownloadHelper from '../../support/fragments/data-export/export-marc-file';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';


const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId = '';
let userName = '';

describe('data-export', () => {
  beforeEach('login', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        userName = userProperties.username;
        cy.login(userProperties.username, userProperties.password);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            cy.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: Cypress.env('holdingSources')[0].id,
              }],
              items: [
                [{
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          });
      });
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteUser(userId);
  });

  it('C9288 Export small number of instance records - default instance mapping profile', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    const fileName = `autoTestFile${getRandomPostfix()}.csv`;

    // download file with existing UUIDs
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.switchToItem();
    InventorySearch.searchByParameter('Barcode', ITEM_BARCODE);
    InventorySearch.saveUUIDs();
    DownloadHelper.downloadCSVFile(fileName, 'SearchInstanceUUIDs*');

    // export file with UUIDs
    cy.visit(TopMenu.dataExportPath);
    ExportFileHelper.uploadFile(fileName);
    ExportFileHelper.exportWithDefaultInstancesJobProfile(fileName);

    // collect expected results and verify actual result
    cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
    cy.wait('@getInfo', getLongDelay()).then((interception) => {
      const job = interception.response.body.jobExecutions[0];
      const resultFileName = job.exportedFiles[0].fileName;
      const recordsCount = job.progress.total;
      const jobId = job.hrId;

      DataExportResults.verifySuccessExportResultCells(resultFileName, recordsCount, jobId, userName);
    });

    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });
});
