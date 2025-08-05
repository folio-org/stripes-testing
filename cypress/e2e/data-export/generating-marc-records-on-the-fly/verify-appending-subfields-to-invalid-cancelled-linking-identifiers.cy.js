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
const csvFileName = `AT_C430245_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = [
  {
    name: 'Invalid ISBN',
    value: 'InvalidISBN_9780000000000',
    field: '020',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'Linking ISSN',
    value: 'LinkingISSN_0000-0000',
    field: '022',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'l',
  },
  {
    name: 'Invalid ISSN',
    value: 'InvalidISSN_0000-0001',
    field: '022',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'Cancelled GPO item number',
    value: 'CancelledGPO_GP123456',
    field: '074',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
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
  instances: identifierConfig.map((config, index) => ({
    instanceTitle: `AT_C430245_FolioInstance_${index + 1}_${getRandomPostfix()}`,
    instanceId: '',
    identifier: {
      identifierTypeId: '',
      value: config.value,
    },
    config,
  })),
};

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
    return f.subf.some((subf) => subf[0] === expectedSubfield && subf[1] === expectedValue);
  });

  expect(field).to.exist;
  expect(field.ind1).to.eq(expectedInd1);
  expect(field.ind2).to.eq(expectedInd2);

  // Verify the subfield value explicitly
  const subfield = field.subf.find((subf) => subf[0] === expectedSubfield);
  expect(subfield).to.exist;
  expect(subfield[1]).to.eq(expectedValue);
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
            const instanceIds = [];

            // Create 5 separate instances, each with one identifier type
            testData.instances.forEach((instanceData, index) => {
              const config = identifierConfig[index];
              const identifierType = identifierTypes.find((type) => type.name === config.name);
              instanceData.identifier.identifierTypeId = identifierType.id;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceData.instanceTitle,
                  identifiers: [instanceData.identifier],
                },
              }).then((createdInstanceData) => {
                instanceData.instanceId = createdInstanceData.instanceId;
                instanceIds.push(instanceData.instanceId);

                // Create CSV file after all instances are created
                if (instanceIds.length === testData.instances.length) {
                  const csvContent = instanceIds.join('\n');
                  FileManager.createFile(`cypress/fixtures/${csvFileName}`, csvContent);
                }
              });
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

      testData.instances.forEach((instanceData) => {
        InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C430245 Verify appending subfields to invalid, cancelled, linking Identifiers without according valid identifiers (ISBN, ISSN, GPO, UPC) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C430245'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(csvFileName);

        // Step 2: Run the instance job profile by clicking on it
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            5,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3: Download the recently created file by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 4-5: Verify identifier mappings to various MARC fields with $z and $l subfields
          const assertionsOnMarcFileContent = testData.instances.map((instanceData) => ({
            uuid: instanceData.instanceId,
            assertions: [
              (record) => {
                const { field, indicator1, indicator2, subfield, value } = instanceData.config;
                verifyFieldMapping(record, field, value, indicator1, indicator2, subfield);

                // Verify the specific field exists and has correct structure
                const fields = record.get(field);
                expect(fields).to.exist;
                expect(fields.length).to.eq(1);
              },
            ],
          }));

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 5);
        });
      },
    );
  });
});
