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
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME, ITEM_STATUS_NAMES } from '../../../support/constants';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

let user;
let location;
let holdingTypeId;
let sourceId;
let loanTypeId;
let materialTypeId;
let exportedFileName;
let holdingsIds;
let holdingsHrids;
let randomPostfix;
let fileName;
let mappingProfileName;
let jobProfileName;
let instanceOne;
let instanceTwo;
const numberOfItems = 11;

const testData = {
  electronicAccess: {
    marcHolding: {
      uri: 'https://example.com/marc-holding',
      linkText: 'MARC Holding Link',
      materialsSpecification: 'MARC Holding Materials',
      publicNote: 'MARC Holding Note',
    },
    folioHolding: {
      uri: 'https://example.com/folio-holding',
      linkText: 'FOLIO Holding Link',
      materialsSpecification: 'FOLIO Holding Materials',
      publicNote: 'FOLIO Holding Note',
    },
  },
  items: {
    marc: [],
    folio: [],
  },
};

const createCustomMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['HOLDINGS', 'ITEM'],
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

describe(
  'Data Export',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Holdings records export', () => {
      beforeEach('create test data', () => {
        holdingsIds = [];
        holdingsHrids = [];
        randomPostfix = getRandomPostfix();
        fileName = `AT_C423571_HoldingsUUIDs_${randomPostfix}.csv`;
        mappingProfileName = `AT_C423571_CustomMappingProfile_${randomPostfix}`;
        jobProfileName = `AT_C423571_CustomJobProfile_${randomPostfix} export job profile`;
        instanceOne = { title: `AT_C423571_MarcInstance_${randomPostfix}` };
        instanceTwo = { title: `AT_C423571_MarcInstance2_${randomPostfix}` };

        cy.createTempUser([
          permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getLocations({ limit: 1 }).then((res) => {
            location = res;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
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

                      // Create 11 items for MARC holding
                      for (let i = 0; i < numberOfItems; i++) {
                        const itemBarcode = `AT_C423571_MARC_${randomPostfix}_${i}`;
                        InventoryItems.createItemViaApi({
                          holdingsRecordId: marcHoldingId,
                          barcode: itemBarcode,
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          permanentLoanType: { id: loanTypeId },
                          materialType: { id: materialTypeId },
                        }).then((item) => {
                          testData.items.marc.push({
                            id: item.id,
                            hrid: item.hrid,
                            barcode: itemBarcode,
                          });
                        });
                      }
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

                      // Create 11 items for FOLIO holding
                      for (let i = 0; i < numberOfItems; i++) {
                        const itemBarcode = `AT_C423571_FOLIO_${randomPostfix}_${i}`;
                        InventoryItems.createItemViaApi({
                          holdingsRecordId: folioHolding.id,
                          barcode: itemBarcode,
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          permanentLoanType: { id: loanTypeId },
                          materialType: { id: materialTypeId },
                        }).then((item) => {
                          testData.items.folio.push({
                            id: item.id,
                            hrid: item.hrid,
                            barcode: itemBarcode,
                          });
                        });
                      }
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

      afterEach('delete test data', () => {
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
        'C423571 Verify export Inventory holdings records based on Custom mapping profile (Holdings & Item) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C423571'] },
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
            `AT_C423571_CustomJobProfile_${randomPostfix}`,
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
              `AT_C423571_CustomJobProfile_${randomPostfix}`,
            );

            cy.getUserToken(user.username, user.password);

            // Step 4: Download the recently created file with extension .mrc
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Step 5-6: Verify exported fields for MARC and FOLIO Holdings with associated Items
            ExportFile.verifyFileIncludes(exportedFileName, [
              ...holdingsHrids,
              ...holdingsIds,
              ...testData.items.marc.map((item) => item.id),
              ...testData.items.folio.map((item) => item.id),
              ...Object.values(testData.electronicAccess.marcHolding),
              ...Object.values(testData.electronicAccess.folioHolding),
              ...testData.items.marc.map((item) => item.barcode),
              ...testData.items.marc.map((item) => item.hrid),
              ...testData.items.folio.map((item) => item.barcode),
              ...testData.items.folio.map((item) => item.hrid),
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
  },
);
