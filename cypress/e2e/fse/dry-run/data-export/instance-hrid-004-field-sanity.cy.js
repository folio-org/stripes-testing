import DataExportLogs from '../../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let instanceId;
let instanceTypeId;
let holdingsTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let instanceHRID;
let holdingsUUID;
let resultsFileName;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `AT_C376962_FolioInstance${getRandomPostfix()}`,
};
const fileName = `AT_C376962_autoTestFile${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch user details
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            locationId = locationData.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getDefaultMaterialType().then((materialType) => {
            materialTypeId = materialType.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: item.instanceName,
            },
            holdings: [
              {
                holdingsTypeId,
                permanentLocationId: locationId,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: 'Available' },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
              },
            ],
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;

            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instanceId}"`,
            }).then((holdings) => {
              holdingsUUID = holdings[0].id;
              FileManager.createFile(`cypress/fixtures/${fileName}`, holdingsUUID);
            });
            cy.getInstanceById(instanceId).then((instance) => {
              instanceHRID = instance.hrid;
            });
          });
        });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);

      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(resultsFileName);
    });

    it(
      'C376962 Verify that Default mapping profile for holdings maps instance HRID to "004" field (firebird)',
      { tags: ['dryRun', 'firebird', 'C376962'] },
      () => {
        ExportFile.uploadFile(fileName);
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const job = response.body.jobExecutions.find(({ runBy }) => runBy.userId === user.id);
          resultsFileName = job.exportedFiles[0].fileName;
          const recordsCount = job.progress.total;
          const jobId = job.hrId;

          DataExportResults.verifySuccessExportResultCells(
            resultsFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );
          DataExportLogs.clickButtonWithText(resultsFileName);
          ExportFile.verifyFileIncludes(resultsFileName, [holdingsUUID, instanceHRID]);
        });
      },
    );
  });
});
