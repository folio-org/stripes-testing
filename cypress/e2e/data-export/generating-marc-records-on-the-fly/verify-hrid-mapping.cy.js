import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let exportedFileName;
const nameForCSVFile = `AT_C10961_file_${getRandomPostfix()}.csv`;
const instance = {
  title: `AT_C10961_FolioInstance_${getRandomPostfix()}`,
  id: '',
  hrid: '',
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.title,
            },
          }).then((createdInstanceData) => {
            instance.id = createdInstanceData.instanceId;

            cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFileFromDownloadsByMask(
        exportedFileName,
        nameForCSVFile,
        'SearchInstanceUUIDs*',
      );
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    });

    it(
      'C10961 Verify HRID mapping (firebird)',
      { tags: ['criticalPath', 'firebird', 'C10961'] },
      () => {
        // Step 1: Go to "Inventory" app
        InventorySearchAndFilter.verifySearchAndFilterPane();

        // Step 2: Select "Instances" tab on the "Search & filter" pane
        InventorySearchAndFilter.instanceTabIsDefault();

        // Step 3: Search for any inventory instance by selecting "FOLIO" option from "Source" filter option
        InventorySearchAndFilter.searchInstanceByTitle(instance.title);

        // Step 4: Click on the "Actions" button => Select "Save instances UUIDs"
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

        // Step 5: Go to the "Data export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
        DataExportLogs.verifyViewAllLogsButtonEnabled();
        DataExportLogs.verifyRunningAccordionExpanded();

        // Step 6: Trigger the data export by clicking on the "or choose file" button and submitting .csv file
        ExportFile.uploadFile(nameForCSVFile);

        // Step 7: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${nameForCSVFile.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 8-9: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 10: Verify HRID is mapped to 001 field in exported MARC record
          const assertionsOnMarcFileContent = [
            {
              uuid: instance.id,
              assertions: [
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', instance.hrid]);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => {
                  expect(record.get('999')[0].subf[0][1]).to.eq(instance.id);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 1);
        });
      },
    );
  });
});
