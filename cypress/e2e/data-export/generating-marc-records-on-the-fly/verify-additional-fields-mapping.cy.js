/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C350403_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  instanceTitle: `AT_C350403_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  instanceHrid: '',
  languages: ['eng'],
  editions: ['First edition'],
  publicationFrequency: ['Annual'],
  publicationRange: ['2020-2023'],
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

          // Create Folio instance with Languages, Editions, Publication frequency, Publication range fields populated
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: testData.instanceTitle,
              languages: testData.languages,
              editions: testData.editions,
              publicationFrequency: testData.publicationFrequency,
              publicationRange: testData.publicationRange,
            },
          }).then((createdInstanceData) => {
            testData.instanceId = createdInstanceData.instanceId;

            cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
              testData.instanceHrid = instanceData.hrid;
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
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName, 'SearchInstanceUUIDs*');
    });

    it(
      'C350403 Generate MARC bib record additional fields are populated in accordance with the recommended mapping (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350403'] },
      () => {
        // Step 1: Go to "Inventory" app
        InventorySearchAndFilter.verifySearchAndFilterPane();

        // Step 2: Search for created folio instance by title
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);

        // Step 3: Click on the "Actions" menu and select "Save Instances UUIDs"
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileName, 'SearchInstanceUUIDs*');

        // Step 4: Go to the "Data Export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonEnabled();
        DataExportLogs.verifyRunningAccordionExpanded();

        // Step 5: Trigger the data export by clicking on the "or choose file" button and submitting .csv file with Instances UUIDs
        ExportFile.uploadFile(csvFileName);

        // Step 6: Run the "Default instance export job profile" by clicking on it > Specify "Instance" type > Click on "Run" button
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

          // Step 7: Download the recently created file with extension .mrc by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 8-9: Verify MARC field mappings for Languages, Editions, Publication frequency, Publication range
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  const languagesField = record.get('041')[0];

                  expect(languagesField).to.exist;
                  expect(languagesField.ind1).to.eq(' ');
                  expect(languagesField.ind2).to.eq(' ');
                  expect(languagesField.subf[0][0]).to.eq('a');
                  expect(languagesField.subf[0][1]).to.eq(testData.languages[0]);
                },
                (record) => {
                  const editionsField = record.get('250')[0];

                  expect(editionsField).to.exist;
                  expect(editionsField.ind1).to.eq(' ');
                  expect(editionsField.ind2).to.eq(' ');
                  expect(editionsField.subf[0][0]).to.eq('a');
                  expect(editionsField.subf[0][1]).to.eq(testData.editions[0]);
                },
                (record) => {
                  const publicationFrequencyField = record.get('310')[0];

                  expect(publicationFrequencyField).to.exist;
                  expect(publicationFrequencyField.ind1).to.eq(' ');
                  expect(publicationFrequencyField.ind2).to.eq(' ');
                  expect(publicationFrequencyField.subf[0][0]).to.eq('a');
                  expect(publicationFrequencyField.subf[0][1]).to.eq(
                    testData.publicationFrequency[0],
                  );
                },
                (record) => {
                  const publicationRangeField = record.get('362')[0];

                  expect(publicationRangeField).to.exist;
                  expect(publicationRangeField.ind1).to.eq('1');
                  expect(publicationRangeField.ind2).to.eq(' ');
                  expect(publicationRangeField.subf[0][0]).to.eq('a');
                  expect(publicationRangeField.subf[0][1]).to.eq(testData.publicationRange[0]);
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
