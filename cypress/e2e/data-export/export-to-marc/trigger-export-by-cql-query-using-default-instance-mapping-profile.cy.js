import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let exportedMRCFileName;
let downloadedCQLFile;
const instance = {
  title: `AT_C15846_FolioInstance_${randomFourDigitNumber()}`,
};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
            }).then((instanceId) => {
              instance.id = instanceId;

              cy.getInstanceById(instance.id).then((instanceData) => {
                instance.hrid = instanceData.hrid;
              });
            });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.searchInstanceByTitle(instance.title);
        InventorySearchAndFilter.saveCQLQuery();

        // Get the downloaded CQL file name
        FileManager.findDownloadedFilesByMask('SearchInstanceCQLQuery*').then(
          (downloadedFilePathes) => {
            const lastDownloadedFilePath =
              downloadedFilePathes.sort()[downloadedFilePathes.length - 1];
            downloadedCQLFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);
            InventoryActions.verifySaveCQLQueryFileName(downloadedCQLFile);

            // Move CQL file to fixtures and navigate to Data Export
            ExportFileHelper.moveDownloadedFileToFixtures(downloadedCQLFile);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFileFromDownloadsByMask(exportedMRCFileName, downloadedCQLFile);
      FileManager.deleteFile(`cypress/fixtures/${downloadedCQLFile}`);
    });

    it(
      'C15846 Trigger export by CQL query - using default instance mapping profile (firebird)',
      { tags: ['extendedPath', 'firebird', 'C15846'] },
      () => {
        // Step 1: Upload CQL file and verify job profile selection page
        ExportFileHelper.uploadFile(downloadedCQLFile);
        ExportFileHelper.exportWithDefaultJobProfile(
          downloadedCQLFile,
          'Default instances',
          'Instances',
          '.cql',
        );
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        DataExportLogs.verifyAreYouSureModalAbsent();

        // Step 2: Wait for job completion and verify results
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedMRCFileName = `${downloadedCQLFile.replace('.cql', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedMRCFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );
          cy.getUserToken(user.username, user.password);

          // Step 3: Download exported .mrc file
          DataExportLogs.clickButtonWithText(exportedMRCFileName);

          // Step 4: Verify exported .mrc file content
          const assertionsOnMarcFileContent = [
            {
              uuid: instance.id,
              assertions: [
                (record) => {
                  expect(record.leader).to.eq('00262nam a22000973c 4500');
                },
                (record) => expect(record.fields[0]).to.deep.eq(['001', instance.hrid]),
                (record) => {
                  expect(record.fields[3]).to.deep.eq(['245', '00', 'a', instance.title]);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.id),
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedMRCFileName, assertionsOnMarcFileContent, 1);
        });
      },
    );
  });
});
