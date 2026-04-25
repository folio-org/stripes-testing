import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';

describe('Data Export', () => {
  let user;
  const sliceSize = 3;
  const defaultSliceSize = 100000;
  const totalInstances = 5;
  const totalHoldingsPerInstance = 2;
  const totalHoldings = 10;
  const totalAuthorities = 15;
  const expectedInstances = [];
  const expectedHoldings = [];
  const expectedAuthorities = [];
  const csvFiles = {
    instances: `AT_C432316_instances_${getRandomPostfix()}.csv`,
    holdings: `AT_C432316_holdings_${getRandomPostfix()}.csv`,
    authorities: `AT_C432316_authorities_${getRandomPostfix()}.csv`,
  };
  const jobProfiles = {
    instances: 'Default instances',
    holdings: 'Default holdings',
    authorities: 'Default authority',
  };

  before('Create test data', () => {
    cy.getAdminToken();

    // Configure slice_size limit via API
    cy.configureDataExportFileLimit('slice_size', sliceSize);

    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      // Get required IDs for creating records
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        const instanceTypeId = instanceTypes[0].id;

        cy.getLocations({ limit: 1 }).then((location) => {
          const locationId = location.id;

          InventoryHoldings.getHoldingsFolioSource()
            .then((holdingSource) => {
              const sourceId = holdingSource.id;

              // Create 5 Instances with 2 Holdings each (10 total)
              const instancePromises = [];
              for (let i = 0; i < totalInstances; i++) {
                const instanceTitle = `AT_C432316_FolioInstance_${i}_${getRandomPostfix()}`;
                const promise = InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitle,
                  },
                }).then((instance) => {
                  expectedInstances.push(instance.instanceId);

                  // Create 2 Holdings for each instance
                  const holdingPromises = [];
                  for (let j = 0; j < totalHoldingsPerInstance; j++) {
                    const holdingPromise = InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.instanceId,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      expectedHoldings.push(holding.id);
                    });
                    holdingPromises.push(holdingPromise);
                  }
                  return Promise.all(holdingPromises);
                });
                instancePromises.push(promise);
              }

              // Create 5 Authorities
              const authorityPromises = [];
              for (let i = 0; i < totalAuthorities; i++) {
                const promise = MarcAuthorities.createMarcAuthorityViaAPI(
                  '',
                  `${getRandomPostfix()}`,
                  [
                    {
                      tag: '100',
                      content: `$a AT_C432316_Authority_${i}_${getRandomPostfix()}`,
                      indicators: ['1', '\\'],
                    },
                  ],
                ).then((authorityId) => {
                  expectedAuthorities.push(authorityId);
                });
                authorityPromises.push(promise);
              }

              // Wait for all records to be created
              return Promise.all([...instancePromises, ...authorityPromises]);
            })
            .then(() => {
              // Create CSV files with UUIDs after all records are created
              FileManager.createFile(
                `cypress/fixtures/${csvFiles.instances}`,
                expectedInstances.join('\n'),
              );
              FileManager.createFile(
                `cypress/fixtures/${csvFiles.holdings}`,
                expectedHoldings.join('\n'),
              );
              FileManager.createFile(
                `cypress/fixtures/${csvFiles.authorities}`,
                expectedAuthorities.join('\n'),
              );
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

    // Reset slice_size to default
    cy.configureDataExportFileLimit('slice_size', defaultSliceSize);

    // Delete created instances (holdings will be deleted automatically)
    expectedInstances.forEach((instanceId) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    // Delete created authorities
    expectedAuthorities.forEach((authorityId) => {
      MarcAuthority.deleteViaAPI(authorityId, true);
    });

    // Delete CSV files
    Object.values(csvFiles).forEach((fileName) => {
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    // Delete downloaded zip files created by this test
    FileManager.deleteFilesFromDownloadsByMask('AT_C432316_*.zip');

    Users.deleteViaApi(user.userId);
  });

  it(
    'C432316 Verify that limit of exported file size is configured on tenant level (firebird)',
    { tags: ['criticalPath', 'firebird', 'C432316'] },
    () => {
      // Test Instances export
      ExportFileHelper.uploadFile(csvFiles.instances);
      ExportFileHelper.exportWithDefaultJobProfile(csvFiles.instances, jobProfiles.instances);

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
        'getInstancesExport',
      );
      cy.wait('@getInstancesExport', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const exportedFile = csvFiles.instances.replace('.csv', '');
        const jobData = jobExecutions.find((job) => {
          return job.exportedFiles[0].fileName.includes(exportedFile);
        });
        const instancesExportFileName = `${csvFiles.instances.replace('.csv', '')}-${jobData.hrId}.zip`;

        DataExportResults.verifySuccessExportResultCells(
          instancesExportFileName,
          totalInstances,
          jobData.hrId,
          user.username,
          jobProfiles.instances,
        );
        cy.getUserToken(user.username, user.password);

        // Download zip file
        DataExportLogs.clickButtonWithText(instancesExportFileName);

        // Verify zip contents
        ExportFileHelper.verifyZipFileContents(instancesExportFileName, totalInstances, sliceSize);
      });

      // Test Holdings export
      ExportFileHelper.uploadFile(csvFiles.holdings);
      ExportFileHelper.exportWithDefaultJobProfile(
        csvFiles.holdings,
        jobProfiles.holdings,
        'Holdings',
      );

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
        'getHoldingsExport',
      );
      cy.wait('@getHoldingsExport', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const exportedFile = csvFiles.holdings.replace('.csv', '');
        const jobData = jobExecutions.find((job) => {
          return job.exportedFiles[0].fileName.includes(exportedFile);
        });
        const holdingsExportFileName = `${csvFiles.holdings.replace('.csv', '')}-${jobData.hrId}.zip`;

        DataExportResults.verifySuccessExportResultCells(
          holdingsExportFileName,
          totalHoldings,
          jobData.hrId,
          user.username,
          jobProfiles.holdings,
        );
        cy.getUserToken(user.username, user.password);

        // Download zip file
        DataExportLogs.clickButtonWithText(holdingsExportFileName);

        // Verify zip contents
        ExportFileHelper.verifyZipFileContents(holdingsExportFileName, totalHoldings, sliceSize);
      });

      // Test Authorities export
      ExportFileHelper.uploadFile(csvFiles.authorities);
      ExportFileHelper.exportWithDefaultJobProfile(
        csvFiles.authorities,
        jobProfiles.authorities,
        'Authorities',
      );

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
        'getAuthoritiesExport',
      );
      cy.wait('@getAuthoritiesExport', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const exportedFile = csvFiles.authorities.replace('.csv', '');
        const jobData = jobExecutions.find((job) => {
          return job.exportedFiles[0].fileName.includes(exportedFile);
        });
        const authoritiesExportFileName = `${csvFiles.authorities.replace('.csv', '')}-${jobData.hrId}.zip`;

        DataExportResults.verifySuccessExportResultCells(
          authoritiesExportFileName,
          totalAuthorities,
          jobData.hrId,
          user.username,
          jobProfiles.authorities,
        );
        cy.getUserToken(user.username, user.password);

        // Download zip file
        DataExportLogs.clickButtonWithText(authoritiesExportFileName);

        // Verify zip contents
        ExportFileHelper.verifyZipFileContents(
          authoritiesExportFileName,
          totalAuthorities,
          sliceSize,
        );
      });
    },
  );
});
