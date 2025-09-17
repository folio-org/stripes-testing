import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let exportedFileName;
let natureOfContentTerm;
const nameForCSVFile = `AT_C10971_file_${getRandomPostfix()}.csv`;
const instance = {
  title: `AT_C10971_FolioInstance_${getRandomPostfix()}`,
  id: '',
  hrid: '',
  natureOfContentTermIds: [],
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        NatureOfContent.getViaApi({ limit: 1 }).then(({ natureOfContentTerms }) => {
          natureOfContentTerm = natureOfContentTerms[0];
          instance.natureOfContentTermIds = [natureOfContentTerm.id];

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
                natureOfContentTermIds: instance.natureOfContentTermIds,
              },
            }).then((createdInstanceData) => {
              instance.id = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                instance.hrid = instanceData.hrid;
              });

              FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, instance.id);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C10971 Verify Nature of Content mapping (firebird)',
      { tags: ['extendedPath', 'firebird', 'C10971'] },
      () => {
        // Step 1: Go to the "Data export" app
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonDisabled(false);
        DataExportLogs.verifyRunningAccordionExpanded();

        // Step 2: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(nameForCSVFile);

        // Step 3: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
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

          // Step 4: Download the recently created file with extension .mrc by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Check exported MARC records - Verify nature of content is mapped to 655$a with first indicator blank and second indicator 4
          const assertionsOnMarcFileContent = [
            {
              uuid: instance.id,
              assertions: [
                (record) => {
                  const natureOfContentField = record.get('655')[0];

                  expect(natureOfContentField.ind1).to.eq(' ');
                  expect(natureOfContentField.ind2).to.eq('4');
                  expect(natureOfContentField.subf[0][0]).to.eq('a');
                  expect(natureOfContentField.subf[0][1]).to.eq(natureOfContentTerm.name);
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
