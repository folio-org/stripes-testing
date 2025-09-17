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
const csvFileName = `AT_C430246_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = [
  {
    name: 'Invalid ISBN',
    field: '020',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'Linking ISSN',
    field: '022',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'l',
  },
  {
    name: 'Invalid ISSN',
    field: '022',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'Cancelled GPO item number',
    field: '074',
    indicator1: ' ',
    indicator2: ' ',
    subfield: 'z',
  },
  {
    name: 'Invalid UPC',
    field: '024',
    indicator1: '1',
    indicator2: ' ',
    subfield: 'z',
  },
];

const testData = {
  instances: identifierConfig.map((config, index) => ({
    instanceTitle: `AT_C430246_FolioInstance_${index + 1}_${getRandomPostfix()}`,
    instanceId: '',
    identifiers: [
      {
        identifierTypeId: '',
        value: `${config.name.replace(/\s+/g, '')}_Value1_${getRandomPostfix()}`,
      },
      {
        identifierTypeId: '',
        value: `${config.name.replace(/\s+/g, '')}_Value2_${getRandomPostfix()}`,
      },
    ],
    config,
  })),
};

// Helper function to verify repeated field mapping
const verifyRepeatedFieldMapping = (
  record,
  expectedValues,
  fieldNumber,
  expectedInd1,
  expectedInd2,
  expectedSubfield,
) => {
  const fields = record.get(fieldNumber);
  expect(fields).to.exist;

  // Find fields that match the expected subfield and indicators
  const matchingFields = fields.filter((field) => {
    return (
      field.ind1 === expectedInd1 &&
      field.ind2 === expectedInd2 &&
      field.subf.some((subf) => subf[0] === expectedSubfield && expectedValues.includes(subf[1]))
    );
  });

  expect(matchingFields.length).to.eq(expectedValues.length);

  expectedValues.forEach((expectedValue) => {
    const field = matchingFields.find((f) => {
      return f.subf.some((subf) => subf[0] === expectedSubfield && subf[1] === expectedValue);
    });

    expect(field).to.exist;
    expect(field.ind1).to.eq(expectedInd1);
    expect(field.ind2).to.eq(expectedInd2);

    // Verify the subfield value explicitly
    const subfield = field.subf.find((subf) => subf[0] === expectedSubfield);

    expect(subfield).to.exist;
    expect(subfield[1]).to.eq(expectedValue);
  });
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

            // Create instances with repeated invalid/cancelled/linking identifiers
            testData.instances.forEach((instanceData, index) => {
              const config = identifierConfig[index];
              const identifierType = identifierTypes.find((type) => type.name === config.name);

              // Set identifier type for all identifiers in this instance
              instanceData.identifiers.forEach((identifier) => {
                identifier.identifierTypeId = identifierType.id;
              });

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceData.instanceTitle,
                  identifiers: instanceData.identifiers,
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
        cy.wait(5000);
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
      'C430246 Verify appending subfields to repeated invalid, cancelled, linking Identifiers without according valid identifiers (ISBN, ISSN, GPO, UPC) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C430246'] },
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

          // Steps 4-5: Verify repeated identifier mappings to various MARC fields
          const assertionsOnMarcFileContent = testData.instances.map((instanceData) => ({
            uuid: instanceData.instanceId,
            assertions: [
              (record) => {
                const { field, indicator1, indicator2, subfield } = instanceData.config;
                const expectedValues = instanceData.identifiers.map((id) => id.value);

                verifyRepeatedFieldMapping(
                  record,
                  expectedValues,
                  field,
                  indicator1,
                  indicator2,
                  subfield,
                );
              },
            ],
          }));

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 5);
        });
      },
    );
  });
});
