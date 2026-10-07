/* eslint-disable no-unused-expressions */
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
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let location;
let holdingTypeId;
let sourceId;
let loanTypeId;
let materialTypeId;
let exportedFileName;
const holdingsIds = [];
const holdingsHrids = [];
const randomPostfix = getRandomPostfix();
const fileName = `AT_C423586_HoldingsUUIDs_${randomPostfix}.csv`;
const mappingProfileName = `AT_C423586_CustomMappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C423586_CustomJobProfile_${randomPostfix} export job profile`;
const instanceOne = { title: `AT_C423586_MarcInstance_${randomPostfix}` };
const instanceTwo = { title: `AT_C423586_FolioInstance_${randomPostfix}` };

const testData = {
  electronicAccess: {
    marcHolding: {
      uri: 'https://example.com/marc-holding-c423586',
      linkText: 'MARC Holding Link C423586',
      materialsSpecification: 'MARC Holding Materials C423586',
      publicNote: 'MARC Holding Note C423586',
    },
    folioHolding: {
      uri: 'https://example.com/folio-holding-c423586',
      linkText: 'FOLIO Holding Link C423586',
      materialsSpecification: 'FOLIO Holding Materials C423586',
      publicNote: 'FOLIO Holding Note C423586',
    },
  },
  items: {
    marc: {},
    folio: {},
  },
};

const createCustomMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
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
            const marcInstanceFields = [
              {
                tag: '008',
                content: QuickMarcEditor.defaultValid008Values,
              },
              {
                tag: '245',
                content: `$a ${instanceOne.title}`,
                indicators: ['1', '0'],
              },
            ];

            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((marcInstanceId) => {
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

                    const itemBarcode = `AT_C423586_MARC_${randomPostfix}`;

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: marcHoldingId,
                      barcode: itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                    }).then((item) => {
                      testData.items.marc = {
                        id: item.id,
                        hrid: item.hrid,
                        barcode: itemBarcode,
                      };
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: instanceTwo.title,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: location.id,
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
                  },
                ],
                items: [
                  {
                    barcode: `AT_C423586_FOLIO_${randomPostfix}`,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                ],
              }).then((createdInstanceData) => {
                holdingsIds.push(createdInstanceData.holdings[0].id);
                testData.items.folio = {
                  id: createdInstanceData.items[0].id,
                  hrid: createdInstanceData.items[0].hrid,
                  barcode: createdInstanceData.items[0].barcode,
                };
                cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                  instanceTwo.id = instanceData.id;
                  instanceTwo.hrid = instanceData.hrid;

                  cy.getHoldings({
                    limit: 1,
                    query: `"id"="${holdingsIds[1]}"`,
                  }).then((holdingsData) => {
                    holdingsHrids.push(holdingsData[0].hrid);
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
      'C423586 Verify export Inventory holdings records based on Custom mapping profile (SRS & Holdings & Item) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423586'] },
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
          `AT_C423586_CustomJobProfile_${randomPostfix}`,
          'Holdings',
        );

        // Step 3: Download the recently created file with extension .mrc
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
            `AT_C423586_CustomJobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the recently created file with extension .mrc
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify exported fields for MARC and FOLIO Holdings with associated Items (no SRS data exported)
          const absentInstanceTags = ['001', '999'];
          const assertionsOnMarcFileContent = [
            {
              uuid: holdingsIds[0],
              assertions: [
                (record) => {
                  const field856 = record.fields.find((f) => f[0] === '856');
                  expect(field856).to.deep.eq([
                    '856',
                    '40',
                    'u',
                    testData.electronicAccess.marcHolding.uri,
                    'y',
                    testData.electronicAccess.marcHolding.linkText,
                    'z',
                    testData.electronicAccess.marcHolding.publicNote,
                    '3',
                    testData.electronicAccess.marcHolding.materialsSpecification,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '876')).to.deep.eq([
                    '876',
                    '  ',
                    'a',
                    testData.items.marc.barcode,
                    '3',
                    holdingsHrids[0],
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '901')).to.deep.eq([
                    '901',
                    '  ',
                    'a',
                    holdingsHrids[0],
                    'b',
                    holdingsIds[0],
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '902')).to.deep.eq([
                    '902',
                    '  ',
                    'a',
                    testData.items.marc.hrid,
                    'b',
                    testData.items.marc.id,
                    '3',
                    holdingsHrids[0],
                  ]);
                },
                (record) => {
                  absentInstanceTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
                },
              ],
            },
            {
              uuid: holdingsIds[1],
              assertions: [
                (record) => {
                  const field856 = record.fields.find((f) => f[0] === '856');
                  expect(field856).to.deep.eq([
                    '856',
                    '40',
                    'u',
                    testData.electronicAccess.folioHolding.uri,
                    'y',
                    testData.electronicAccess.folioHolding.linkText,
                    'z',
                    testData.electronicAccess.folioHolding.publicNote,
                    '3',
                    testData.electronicAccess.folioHolding.materialsSpecification,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '876')).to.deep.eq([
                    '876',
                    '  ',
                    'a',
                    testData.items.folio.barcode,
                    '3',
                    holdingsHrids[1],
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '901')).to.deep.eq([
                    '901',
                    '  ',
                    'a',
                    holdingsHrids[1],
                    'b',
                    holdingsIds[1],
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '902')).to.deep.eq([
                    '902',
                    '  ',
                    'a',
                    testData.items.folio.hrid,
                    'b',
                    testData.items.folio.id,
                    '3',
                    holdingsHrids[1],
                  ]);
                },
                (record) => {
                  absentInstanceTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 2, false);
        });
      },
    );
  });
});
