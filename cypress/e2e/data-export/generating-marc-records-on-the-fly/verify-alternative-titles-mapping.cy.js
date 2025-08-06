/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C350405_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  instanceTitle: `AT_C350405_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  instanceHrid: '',
  alternativeTitles: [
    {
      alternativeTitle: 'Test Variant Title',
      alternativeTitleTypeId: '',
    },
    {
      alternativeTitle: 'Test Uniform Title',
      alternativeTitleTypeId: '',
    },
  ],
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

          cy.getAlternativeTitlesTypes({ limit: 100 }).then((titleTypes) => {
            const variantTitleType = titleTypes.find((type) => type.name === 'Variant title');
            const uniformTitleType = titleTypes.find((type) => type.name === 'Uniform title');

            testData.alternativeTitles[0].alternativeTitleTypeId = variantTitleType.id;
            testData.alternativeTitles[1].alternativeTitleTypeId = uniformTitleType.id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: testData.instanceTitle,
                alternativeTitles: testData.alternativeTitles,
              },
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                testData.instanceHrid = instanceData.hrid;
              });

              FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C350405 Verify Alternative titles conditionally replacing keys with values (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350405'] },
      () => {
        // Step 1: Go to the "Data Export" app
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonEnabled();
        DataExportLogs.verifyRunningAccordionExpanded();

        // Step 2: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(csvFileName);

        // Step 3: Run the "Default instance export job profile" by clicking on it > Specify "Instance" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 4: Download the recently created file with extension .mrc by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify MARC field mappings for Alternative titles
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  const variantTitleField = record.get('246')[0];

                  expect(variantTitleField).to.exist;
                  expect(variantTitleField.ind1).to.eq('0');
                  expect(variantTitleField.ind2).to.eq(' ');
                  expect(variantTitleField.subf[0][0]).to.eq('a');
                  expect(variantTitleField.subf[0][1]).to.eq(
                    testData.alternativeTitles[0].alternativeTitle,
                  );
                },
                (record) => {
                  const uniformTitleField = record.get('130')[0];

                  expect(uniformTitleField).to.exist;
                  expect(uniformTitleField.ind1).to.eq('0');
                  expect(uniformTitleField.ind2).to.eq(' ');
                  expect(uniformTitleField.subf[0][0]).to.eq('a');
                  expect(uniformTitleField.subf[0][1]).to.eq(
                    testData.alternativeTitles[1].alternativeTitle,
                  );
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
