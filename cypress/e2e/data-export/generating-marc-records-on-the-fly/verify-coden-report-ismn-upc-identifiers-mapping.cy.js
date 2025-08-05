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
const csvFileName = `AT_C350431_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = [
  {
    name: 'CODEN',
    value: 'CODEN_ABCDEF',
    field: '030',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'a',
  },
  {
    name: 'Report number',
    value: 'ReportNumber_RN123456',
    field: '088',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'a',
  },
  {
    name: 'ISMN',
    value: 'ISMN_9790000000000',
    field: '024',
    indicator1: '2',
    indicator2: ' ',
    subfield: 'a',
  },
  {
    name: 'Invalid ISMN',
    value: 'InvalidISMN_9790000000001',
    field: '024',
    indicator1: '2',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'UPC',
    value: 'UPC_123456789012',
    field: '024',
    indicator1: '1',
    indicator2: ' ',
    subfield: 'a',
  },
  {
    name: 'Invalid UPC',
    value: 'InvalidUPC_123456789013',
    field: '024',
    indicator1: '1',
    indicator2: ' ',
    subfield: 'z',
  },
];
const testData = {
  instanceTitle: `AT_C350431_FolioInstance_${getRandomPostfix()}`,
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
      'C350431 Verify appending subfields to Identifiers (CODEN, Report number, ISMN, Invalid ISMN, UPC, Invalid UPC) with repeated fields (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350431'] },
      () => {
        // Step 1: Go to the "Data Export" app (already logged in from before block)
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

          // Step 5-6: Verify identifier mappings to multiple MARC fields

          // Helper function to verify field mapping
          const verifyFieldMapping = (
            record,
            fieldNumber,
            expectedValue,
            expectedInd1,
            expectedInd2,
            expectedSubfield,
          ) => {
            const fields = record.get(fieldNumber);
            expect(fields).to.exist;

            const field = fields.find((f) => {
              return f.subf.some(
                (subf) => subf[0] === expectedSubfield && subf[1] === expectedValue,
              );
            });

            expect(field).to.exist;
            expect(field.ind1).to.eq(expectedInd1);
            expect(field.ind2).to.eq(expectedInd2);

            // Verify the subfield value explicitly
            const subfield = field.subf.find((subf) => subf[0] === expectedSubfield);

            expect(subfield).to.exist;
            expect(subfield[1]).to.eq(expectedValue);
          };

          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  // Verify all identifier mappings using configuration
                  identifierConfig.forEach(({ value, field, indicator1, indicator2, subfield }) => {
                    verifyFieldMapping(record, field, value, indicator1, indicator2, subfield);
                  });

                  // Verify field 024 has repeated subfields (4 total: ISMN, Invalid ISMN, UPC, Invalid UPC)
                  const field024 = record.get('024');

                  expect(field024).to.exist;
                  expect(field024.length).to.eq(4);

                  // Verify field 030 exists for CODEN
                  const field030 = record.get('030');

                  expect(field030).to.exist;
                  expect(field030.length).to.eq(1);

                  // Verify field 088 exists for Report number
                  const field088 = record.get('088');

                  expect(field088).to.exist;
                  expect(field088.length).to.eq(1);
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
