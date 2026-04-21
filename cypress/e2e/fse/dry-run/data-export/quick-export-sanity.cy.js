import DataExportLogs from '../../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../../support/fragments/data-export/dataExportResults';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { parseSanityParameters } from '../../../../support/utils/users';
import parseMrcFileContentAndVerify, {
  verify001FieldValue,
  verify005FieldValue,
  verifyMarcFieldByTag,
} from '../../../../support/utils/parseMrcFileContent';

describe('Data Export', () => {
  describe('Search in Inventory', () => {
    const { user, memberTenant } = parseSanityParameters();
    let instanceId = null;
    let instanceTypeId = null;
    let instanceHrid = null;
    let exportedMrcFileName = null;
    const instanceTitle = `AT_C196757_testBulkEdit_${getRandomPostfix()}`;

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch user details
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          });
        })
        .then(() => {
          // Create test data
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instanceTitle,
            },
          }).then((createdInstanceId) => {
            instanceId = createdInstanceId;

            cy.getInstanceById(createdInstanceId).then((instanceDetails) => {
              instanceHrid = instanceDetails.hrid;
            });
          });
        });
    });

    after('Cleanup', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      if (instanceId) {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      }
      FileManager.deleteFileFromDownloadsByMask(
        'QuickInstanceExport*',
        'SearchInstanceUUIDs*',
        'SearchInstanceCQLQuery*',
      );
      if (exportedMrcFileName) {
        FileManager.deleteFileFromDownloadsByMask(exportedMrcFileName);
      }
    });

    it(
      'C196757 Export selected records (MARC) (firebird)',
      { tags: ['dryRun', 'firebird', 'C196757'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password);
        cy.allure().logCommandSteps(true);
        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.exportInstanceMarc();

        cy.intercept('POST', '/data-export/quick-export').as('getIds');
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedIDs = req.request.body.uuids;
          const jobHrid = req.response.body.jobExecutionHrId;

          FileManager.verifyFile(
            InventoryActions.verifyInstancesMARCFileName,
            'QuickInstanceExport*',
            InventoryActions.verifyInstancesMARC,
            [expectedIDs],
          );

          // Navigate to Data export app
          TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Verify new export job in logs
          cy.getUserToken(user.username, user.password, { log: false });
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
          cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
            exportedMrcFileName = `quick-export-${jobHrid}.mrc`;
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find((jobExecution) => {
              return jobExecution.exportedFiles[0].fileName.includes(exportedMrcFileName);
            });
            const jobId = jobData.hrId;

            // Verify success export result cells and download the MRC file
            DataExportResults.verifySuccessExportResultCells(
              exportedMrcFileName,
              1,
              jobId,
              user.username,
            );
            DataExportLogs.clickButtonWithText(exportedMrcFileName);

            // Verify MARC record mapping
            const marcFieldAssertions = [
              (record) => verify001FieldValue(record, instanceHrid),
              (record) => verify005FieldValue(record),
              (record) => {
                verifyMarcFieldByTag(record, '245', {
                  ind1: '0',
                  ind2: '0',
                  subfields: ['a', instanceTitle],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: ['i', instanceId],
                });
              },
            ];

            parseMrcFileContentAndVerify(
              exportedMrcFileName,
              [
                {
                  uuid: instanceId,
                  assertions: marcFieldAssertions,
                },
              ],
              1,
            );
          });
        });
      },
    );
  });
});
