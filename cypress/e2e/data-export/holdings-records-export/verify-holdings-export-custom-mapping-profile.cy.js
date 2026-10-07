import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../support/constants';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

let user;
let location;
let holdingTypeId;
let sourceId;
let exportedFileName;
const holdingsIds = [];
const holdingsHrids = [];
const randomPostfix = getRandomPostfix();
const fileName = `AT_C423570_HoldingsUUIDs_${randomPostfix}.csv`;
const mappingProfileName = `AT_C423570_CustomMappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C423570_CustomJobProfile_${randomPostfix} export job profile`;
const instanceOne = { title: `AT_C423570_MarcInstance_${randomPostfix}` };
const instanceTwo = { title: `AT_C423570_MarcInstance2_${randomPostfix}` };

const testData = {
  electronicAccess: {
    marcHolding: {
      uri: 'https://example.com/marc-holding1',
      linkText: 'MARC Holding 1 Link',
      materialsSpecification: 'MARC Holding 1 Materials',
      publicNote: 'MARC Holding 1 Note',
    },
    folioHolding: {
      uri: 'https://example.com/folio-holding',
      linkText: 'FOLIO Holding Link',
      materialsSpecification: 'FOLIO Holding Materials',
      publicNote: 'FOLIO Holding Note',
    },
  },
};

const createCustomMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['HOLDINGS'],
  outputFormat: 'MARC',
  name: mappingProfileName,
  fieldsSuppression: '',
  suppress999ff: false,
  transformations: [
    {
      fieldId: 'holdings.electronic.access.linktext.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].linkText`,
      recordType: 'HOLDINGS',
      transformation: '85640$y',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.materialsspecification.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].materialsSpecification`,
      recordType: 'HOLDINGS',
      transformation: '85640$3',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.uri.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].uri`,
      recordType: 'HOLDINGS',
      transformation: '85640$u',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.publicnote.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].publicNote`,
      recordType: 'HOLDINGS',
      transformation: '85640$z',
      enabled: true,
    },
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
  ],
});

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({ limit: 1 }).then((res) => {
          location = res;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;
        });
        cy.getHoldingTypes({ limit: 1 })
          .then((res) => {
            holdingTypeId = res[0].id;
          })
          .then(() => {
            UrlRelationship.getViaApi({
              query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
            }).then((relationships) => {
              testData.resourceRelationshipId = relationships[0].id;
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(instanceOne.title).then((marcInstanceId) => {
              instanceOne.id = marcInstanceId;

              cy.getInstanceById(marcInstanceId).then((instanceData) => {
                instanceOne.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceOne.id,
                  instanceOne.hrid,
                  location.code,
                ).then((marcHoldingId) => {
                  cy.getHoldings({
                    limit: 1,
                    query: `"id"="${marcHoldingId}"`,
                  }).then((marcHoldings) => {
                    holdingsIds.push(marcHoldingId);
                    holdingsHrids.push(marcHoldings[0].hrid);

                    cy.getRecordDataInEditorViaApi(marcHoldingId).then((marcData) => {
                      marcData.relatedRecordVersion = 1;
                      marcData.fields.push({
                        tag: '856',
                        content: [
                          `$u ${testData.electronicAccess.marcHolding.uri}`,
                          `$y ${testData.electronicAccess.marcHolding.linkText}`,
                          `$3 ${testData.electronicAccess.marcHolding.materialsSpecification}`,
                          `$z ${testData.electronicAccess.marcHolding.publicNote}`,
                        ].join(' '),
                        indicators: ['4', '0'],
                      });

                      cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData);
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(instanceTwo.title).then((marcInstanceId) => {
              instanceTwo.id = marcInstanceId;

              cy.getInstanceById(marcInstanceId).then((instanceData) => {
                instanceTwo.hrid = instanceData.hrid;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceTwo.id,
                  permanentLocationId: location.id,
                  holdingsTypeId: holdingTypeId,
                  sourceId,
                  electronicAccess: [
                    {
                      relationshipId: testData.resourceRelationshipId,
                      uri: testData.electronicAccess.folioHolding.uri,
                      linkText: testData.electronicAccess.folioHolding.linkText,
                      materialsSpecification:
                        testData.electronicAccess.folioHolding.materialsSpecification,
                      publicNote: testData.electronicAccess.folioHolding.publicNote,
                    },
                  ],
                }).then((folioHolding) => {
                  cy.getHoldings({
                    limit: 1,
                    query: `"id"="${folioHolding.id}"`,
                  }).then((holdings) => {
                    holdingsIds.push(folioHolding.id);
                    holdingsHrids.push(holdings[0].hrid);
                  });
                });
              });
            });
          })
          .then(() => {
            const customMappingProfile = createCustomMappingProfile(
              testData.resourceRelationshipId,
            );

            cy.createDataExportCustomMappingProfile(customMappingProfile).then((response) => {
              testData.mappingProfileId = response.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                jobProfileName,
                testData.mappingProfileId,
              ).then((jobResponse) => {
                testData.jobProfileId = jobResponse.body.id;
              });
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${fileName}`, holdingsIds.join('\n'));
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceOne.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceTwo.id);
      Users.deleteViaApi(user.userId);
      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C423570 Verify export Inventory holdings records based on Custom mapping profile (Holdings) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423570'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with Holdings UUIDs
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Custom job profile > Specify "holdings" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(
          fileName,
          `AT_C423570_CustomJobProfile_${randomPostfix}`,
          'Holdings',
        );

        // Step 3: Check the table with data export logs
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            2,
            jobId,
            user.username,
            `AT_C423570_CustomJobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the recently created file with extension .mrc
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify exported fields for MARC and FOLIO Holdings
          ExportFile.verifyFileIncludes(exportedFileName, [
            ...holdingsHrids,
            ...holdingsIds,
            ...Object.values(testData.electronicAccess.marcHolding),
            ...Object.values(testData.electronicAccess.folioHolding),
          ]);
          ExportFile.verifyFileIncludes(
            exportedFileName,
            [instanceOne.hrid, instanceTwo.hrid, 'note'],
            false,
          );
        });
      },
    );
  });
});
