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
const csvFileName = `AT_C350438_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = [{ name: 'ASIN', value: 'ASIN_B01ABCD123' }];
const testData = {
  instanceTitle: `AT_C350438_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  identifiers: identifierConfig.map((config) => ({
    identifierTypeId: '',
    value: config.value,
  })),
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportViewAddUpdateProfiles.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          cy.getInstanceIdentifierTypes().then(() => {
            const identifierTypes = Cypress.env('identifierTypes');

            // Set identifier type IDs using configuration
            identifierConfig.forEach((config, index) => {
              const identifierType = identifierTypes.find((type) => type.name === config.name);
              testData.identifiers[index].identifierTypeId = identifierType.id;
            });

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: testData.instanceTitle,
                identifiers: testData.identifiers,
              },
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;

              FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        cy.wait(5000);
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
      'C350438 Verify appending subfields to 1 any Identifier of ASIN, BNB, Local identifiers, StEdNL, UKMac. (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350438'] },
      () => {
        // Step 1: Go to the "Data Export" app (already logged in from before block)
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonDisabled(false);
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

          // Step 5-6: Verify identifier mapping to field 024
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  // Verify field 024 mapping for ASIN identifier
                  const identifierFields = record.get('024');

                  expect(identifierFields).to.exist;
                  expect(identifierFields.length).to.eq(1);

                  const field = identifierFields[0];
                  const { name, value } = identifierConfig[0];

                  expect(field).to.exist;
                  expect(field.ind1).to.eq('8');
                  expect(field.ind2).to.eq(' ');
                  expect(field.subf[0][0]).to.eq('a');
                  expect(field.subf[0][1]).to.eq(value);
                  expect(field.subf[1][0]).to.eq('q');
                  expect(field.subf[1][1]).to.eq(name);
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
