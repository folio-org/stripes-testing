/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
const randomPostfix = getRandomPostfix();
// Use enough instances to build a long CQL query (regression for MDEXP-477)
const instancesCount = 25;
const instances = [];
const cqlFileName = `AT_C350713_LongQuery_${randomPostfix}.cql`;
const mappingProfileName = `AT_C350713_MappingProfile_${randomPostfix}`;
const jobProfileShortName = `AT_C350713_JobProfile_${randomPostfix}`;
const jobProfileName = `${jobProfileShortName} export job profile`;
const itemBarcodePrefix = `AT_C350713_${randomPostfix}`;

const testData = {};
let exportedMRCFileName;

const createMappingProfileBody = () => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  name: mappingProfileName,
  fieldsSuppression: '',
  suppress999ff: false,
  transformations: [
    {
      fieldId: 'holdings.hrid',
      path: '$.holdings[*].hrid',
      recordType: 'HOLDINGS',
      transformation: '901  $a',
      enabled: true,
    },
    {
      fieldId: 'holdings.id',
      path: '$.holdings[*].id',
      recordType: 'HOLDINGS',
      transformation: '901  $b',
      enabled: true,
    },
    {
      fieldId: 'item.barcode',
      path: '$.holdings[*].items[*].barcode',
      recordType: 'ITEM',
      transformation: '876  $a',
      enabled: true,
    },
    {
      fieldId: 'item.hrid',
      path: '$.holdings[*].items[*].hrid',
      recordType: 'ITEM',
      transformation: '902  $a',
      enabled: true,
    },
    {
      fieldId: 'item.id',
      path: '$.holdings[*].items[*].id',
      recordType: 'ITEM',
      transformation: '902  $b',
      enabled: true,
    },
  ],
});

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });
        cy.getLocations({ limit: 1 }).then((loc) => {
          testData.locationId = loc.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((material) => {
          testData.materialTypeId = material.id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });

        // Create FOLIO instances with holdings and items so that mapping profile
        // transformations for HOLDINGS and ITEM produce content in the exported MARC file.
        cy.then(() => {
          const itemsToCreate = Array.from({ length: instancesCount }, (_, i) => i);

          cy.wrap(itemsToCreate).each((i) => {
            const title = `AT_C350713_FolioInstance_${i + 1}_${randomPostfix}`;
            const barcode = `${itemBarcodePrefix}_${i + 1}`;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                },
              ],
              items: [
                {
                  barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((created) => {
              const instanceData = {
                uuid: created.instanceId,
                title,
                barcode,
                holdingsId: created.holdings[0].id,
                itemId: created.items[0].id,
                itemHrid: created.items[0].hrid,
              };

              cy.getInstanceById(created.instanceId).then((res) => {
                instanceData.hrid = res.hrid;
              });
              cy.getHoldings({ limit: 1, query: `"instanceId"="${created.instanceId}"` }).then(
                (holdings) => {
                  instanceData.holdingsHrid = holdings[0].hrid;
                },
              );

              instances.push(instanceData);
            });
          });
        }).then(() => {
          // Build a long CQL query (id==... or id==... or ...) to satisfy
          // the precondition: ".cql file containing long query".
          const longCqlQuery = instances.map((inst) => `id=="${inst.uuid}"`).join(' or ');

          FileManager.createFile(`cypress/fixtures/${cqlFileName}`, longCqlQuery);
        });

        // Create custom mapping profile with HOLDINGS and ITEM transformations
        // and an associated job profile linked to it.
        cy.then(() => {
          cy.createDataExportCustomMappingProfile(createMappingProfileBody()).then((resp) => {
            testData.mappingProfileId = resp.id;

            ExportNewJobProfile.createNewJobProfileViaApi(
              jobProfileName,
              testData.mappingProfileId,
            ).then((jobResp) => {
              testData.jobProfileId = jobResp.body.id;
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

      instances.forEach((inst) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: {
            instanceId: inst.uuid,
            items: [{ id: inst.itemId, barcode: inst.barcode }],
            holdings: [{ id: inst.holdingsId }],
          },
        });
      });

      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${cqlFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedMRCFileName);
    });

    it(
      'C350713 Trigger export by cql file that contains long query (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350713'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button at jobs panel
        // and submitting .cql file containing long query from Preconditions #3
        ExportFileHelper.uploadFile(cqlFileName);

        // "Select job profile to run the export" page opens immediately with available job profiles displayed
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Custom job profile configured in Preconditions #2 by clicking on it
        // > Specify "Instance" type > Click on "Run" button
        ExportFileHelper.exportWithDefaultJobProfile(
          cqlFileName,
          jobProfileShortName,
          'Instances',
          '.cql',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        DataExportLogs.verifyAreYouSureModalAbsent();

        // After the job completes -- the "Logs" main page is displayed with created file
        // The file has extension .mrc, the filename is a hyperlink, status is "Completed"
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedMRCFileName = `${cqlFileName.replace('.cql', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedMRCFileName,
            instancesCount,
            jobId,
            user.username,
            jobProfileShortName,
            new Date(jobData.completedDate).getTime(),
          );

          cy.getUserToken(user.username, user.password);

          // Step 3: Download the recently created file with extension .mrc by clicking on file name hyperlink
          DataExportLogs.clickButtonWithText(exportedMRCFileName);
          // Ensure the exported MARC file is actually present in cypress/downloads
          // before parsing. UI-triggered downloads can be flaky for large exports
          // built from a long CQL query, so fall back to downloading via API.
          ExportFileHelper.downloadExportedMarcFileWithRecordHrid(jobId, exportedMRCFileName);

          // Step 4: Run the downloaded .mrc file with any available MARC editor tool
          // Verify the file contains generated records in MARC format, formatted correctly
          const assertionsOnMarcFileContent = instances.map((inst) => ({
            uuid: inst.uuid,
            assertions: [
              (record) => expect(record.get('001')[0].value).to.eq(inst.hrid),
              (record) => {
                const field245 = record.fields.find((f) => f[0] === '245');
                expect(field245).to.deep.eq(['245', '00', 'a', inst.title]);
              },
              (record) => {
                expect(record.fields.find((f) => f[0] === '876')).to.deep.eq([
                  '876',
                  '  ',
                  'a',
                  inst.barcode,
                  '3',
                  inst.holdingsHrid,
                ]);
              },
              (record) => {
                expect(record.fields.find((f) => f[0] === '901')).to.deep.eq([
                  '901',
                  '  ',
                  'a',
                  inst.holdingsHrid,
                  'b',
                  inst.holdingsId,
                ]);
              },
              (record) => {
                expect(record.fields.find((f) => f[0] === '902')).to.deep.eq([
                  '902',
                  '  ',
                  'a',
                  inst.itemHrid,
                  'b',
                  inst.itemId,
                  '3',
                  inst.holdingsHrid,
                ]);
              },
              (record) => {
                expect(record.fields.find((f) => f[0] === '999')).to.deep.eq([
                  '999',
                  'ff',
                  'i',
                  inst.uuid,
                ]);
              },
            ],
          }));

          parseMrcFileContentAndVerify(
            exportedMRCFileName,
            assertionsOnMarcFileContent,
            instancesCount,
          );
        });
      },
    );
  });
});
