import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

const contributorTestData = [
  // Primary contributors
  {
    name: 'Smith, John',
    primary: true,
    nameType: 'Personal name',
    marcField: '100',
    indicator1: '1',
    indicator2: ' ',
  },
  {
    name: 'ACME Corporation',
    primary: true,
    nameType: 'Corporate name',
    marcField: '110',
    indicator1: '2',
    indicator2: ' ',
  },
  {
    name: 'Annual Science Conference',
    primary: true,
    nameType: 'Meeting name',
    marcField: '111',
    indicator1: '2',
    indicator2: ' ',
  },
  // Non-primary contributors
  {
    name: 'Johnson, Mary',
    primary: false,
    nameType: 'Personal name',
    marcField: '700',
    indicator1: '1',
    indicator2: ' ',
  },
  {
    name: 'Global Tech Inc',
    primary: false,
    nameType: 'Corporate name',
    marcField: '710',
    indicator1: '2',
    indicator2: ' ',
  },
  {
    name: 'International Workshop',
    primary: false,
    nameType: 'Meeting name',
    marcField: '711',
    indicator1: '2',
    indicator2: ' ',
  },
];

let user;
let instanceTypeId;
let contributorNameTypes;
let exportedFileName;
const csvFileName = `AT_C10964_instanceUUIDs_${getRandomPostfix()}.csv`;
const instances = contributorTestData.map((contributor, index) => ({
  title: `AT_C10964_FolioInstance_${getRandomPostfix()}_${index + 1}`,
  id: '',
  hrid: '',
  contributor,
}));

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;

            // Get contributor name types
            BrowseContributors.getContributorNameTypes({ searchParams: { limit: 100 } }).then(
              (nameTypes) => {
                contributorNameTypes = nameTypes;

                instances.forEach((instance) => {
                  const nameType = contributorNameTypes.find(
                    (type) => type.name === instance.contributor.nameType,
                  );

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instance.title,
                      contributors: [
                        {
                          name: instance.contributor.name,
                          contributorNameTypeId: nameType.id,
                          primary: instance.contributor.primary,
                        },
                      ],
                    },
                  }).then((createdInstanceData) => {
                    instance.id = createdInstanceData.instanceId;

                    cy.getInstanceById(instance.id).then((instanceData) => {
                      instance.hrid = instanceData.hrid;
                    });
                  });
                });
              },
            );
          })
          .then(() => {
            const instanceIds = instances.map((instance) => instance.id).join('\n');

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceIds);
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

      instances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });

      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C10964 Verify Contributors mapping (firebird)',
      { tags: ['extendedPath', 'firebird', 'C10964'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with UUIDs of inventory instances from Preconditions
        ExportFile.uploadFile(csvFileName);

        // Step 2: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            instances.length,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3-4: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5: Check that contributors are being correctly mapped according to the mapping rules
          const commonAssertions = (instance) => [
            (record) => {
              expect(record.fields[0]).to.deep.eq(['001', instance.hrid]);
            },
            (record) => {
              const marcField = record.get(instance.contributor.marcField);

              expect(marcField[0].ind1).to.eq(instance.contributor.indicator1);
              expect(marcField[0].ind2).to.eq(instance.contributor.indicator2);
              expect(marcField[0].subf[0][0]).to.eq('a');
              expect(marcField[0].subf[0][1]).to.eq(instance.contributor.name);
            },
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => {
              expect(record.get('999')[0].subf[0][1]).to.eq(instance.id);
            },
          ];

          const assertionsOnMarcFileContent = instances.map((instance) => ({
            uuid: instance.id,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            instances.length,
          );
        });
      },
    );
  });
});
