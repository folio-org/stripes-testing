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
import { ITEM_STATUS_NAMES, HOLDING_NOTE_TYPES, ITEM_NOTE_TYPES } from '../../../support/constants';
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
const fileName = `AT_C466269_HoldingsUUIDs_${randomPostfix}.csv`;
const mappingProfileName = `AT_C466269_CustomMappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C466269_CustomJobProfile_${randomPostfix} export job profile`;
const instanceOne = { title: `AT_C466269_MarcInstance_${randomPostfix}` };
const instanceTwo = { title: `AT_C466269_FolioInstance_${randomPostfix}` };

const testData = {
  marcHolding: {
    notes: {
      actionNote:
        'declassified 19890428 special re-review Joe Smith document from confidential NSI to unclassified official use only, exemption 2: circumvention of statute',
      bindingNote:
        'Late 16th century blind-tooled centrepiece binding, dark brown calf. <URI> StEdNL',
      reproductionNote:
        'Microfilm. Washington, D.C. : United States Historical Documents Institute, [1972] 12 reels ; 35 mm. s1972####dcun#a',
    },
    holdingsStatement: 'Holdings statement',
  },
  folioHolding: {
    notes: {
      actionNote: 'FOLIO Action Note',
      bindingNote: 'FOLIO Binding Note',
      reproductionNote: 'FOLIO Reproduction Note',
    },
    holdingsStatement: 'FOLIO Holdings Statement',
  },
  items: {
    marc: {
      actionNote: 'MARC Item Action Note',
      bindingNote: 'MARC Item Binding Note',
      reproductionNote: 'MARC Item Reproduction Note',
    },
    folio: {
      actionNote: 'FOLIO Item Action Note',
      bindingNote: 'FOLIO Item Binding Note',
      reproductionNote: 'FOLIO Item Reproduction Note',
    },
  },
};

const createCustomMappingProfile = (
  holdingActionNoteTypeId,
  holdingBindingNoteTypeId,
  holdingReproductionNoteTypeId,
  itemActionNoteTypeId,
  itemBindingNoteTypeId,
  itemReproductionNoteTypeId,
) => ({
  default: false,
  recordTypes: ['HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  name: mappingProfileName,
  fieldsSuppression: '533,563,583,533',
  suppress999ff: true,
  transformations: [
    {
      fieldId: 'holdings.hrid',
      path: '$.holdings[*].hrid',
      recordType: 'HOLDINGS',
      transformation: '901  $a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingsstatements.statement',
      path: '$.holdings[*].holdingsStatements[*].statement',
      recordType: 'HOLDINGS',
      transformation: '866 0$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.instanceid',
      path: '$.holdings[*].instanceId',
      recordType: 'HOLDINGS',
      transformation: '999ff$i',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.action.note',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${holdingActionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '533hh$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.binding',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${holdingBindingNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '583hh$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.reproduction',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${holdingReproductionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '563hh$a',
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
      fieldId: 'item.holdingsrecordid',
      path: '$.holdings[*].items[*].holdingsRecordId',
      recordType: 'ITEM',
      transformation: '999hh$i',
      enabled: true,
    },
    {
      fieldId: 'item.itemnotetypeid.action.note',
      path: `$.holdings[*].items[*].notes[?(@.itemNoteTypeId=='${itemActionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'ITEM',
      transformation: '533ii$a',
      enabled: true,
    },
    {
      fieldId: 'item.itemnotetypeid.binding',
      path: `$.holdings[*].items[*].notes[?(@.itemNoteTypeId=='${itemBindingNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'ITEM',
      transformation: '583ii$a',
      enabled: true,
    },
    {
      fieldId: 'item.itemnotetypeid.reproduction',
      path: `$.holdings[*].items[*].notes[?(@.itemNoteTypeId=='${itemReproductionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'ITEM',
      transformation: '563ii$a',
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
            const holdingNoteTypesToFetch = [
              { name: HOLDING_NOTE_TYPES.ACTION_NOTE, key: 'holdingActionNoteTypeId' },
              { name: HOLDING_NOTE_TYPES.BINDING, key: 'holdingBindingNoteTypeId' },
              { name: HOLDING_NOTE_TYPES.REPRODUCTION, key: 'holdingReproductionNoteTypeId' },
            ];

            holdingNoteTypesToFetch.forEach(({ name, key }) => {
              cy.getHoldingNoteTypeIdViaAPI(name).then((id) => {
                testData[key] = id;
              });
            });

            InventoryInstances.getItemNoteTypes().then((noteTypes) => {
              testData.itemActionNoteTypeId = noteTypes.find(
                (nt) => nt.name === ITEM_NOTE_TYPES.ACTION_NOTE,
              ).id;
              testData.itemBindingNoteTypeId = noteTypes.find(
                (nt) => nt.name === ITEM_NOTE_TYPES.BINDING,
              ).id;
              testData.itemReproductionNoteTypeId = noteTypes.find(
                (nt) => nt.name === ITEM_NOTE_TYPES.NOTE,
              ).id;
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
                      marcData.relatedRecordVersion = 2;
                      marcData.fields.push(
                        {
                          tag: '533',
                          content:
                            '$a Microfilm. $b Washington, D.C. : $c United States Historical Documents Institute, $d [1972] $e 12 reels ; 35 mm. $7 s1972####dcun#a',
                          indicators: ['\\', '\\'],
                        },
                        {
                          tag: '563',
                          content:
                            '$a Late 16th century blind-tooled centrepiece binding, dark brown calf. $u <URI> $5 StEdNL',
                          indicators: ['\\', '\\'],
                        },
                        {
                          tag: '583',
                          content:
                            '$a declassified $c 19890428 $f special re-review $h Joe Smith $o document $x from confidential NSI to unclassified official use only, exemption 2: circumvention of statute',
                          indicators: ['0', '\\'],
                        },
                        {
                          tag: '866',
                          content: '$a Holdings statement',
                          indicators: ['\\', '0'],
                        },
                      );
                      cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData);
                    });

                    const itemBarcode = `AT_C466269_MARC_${randomPostfix}`;

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: marcHoldingId,
                      barcode: itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      notes: [
                        {
                          itemNoteTypeId: testData.itemActionNoteTypeId,
                          note: testData.items.marc.actionNote,
                          staffOnly: false,
                        },
                        {
                          itemNoteTypeId: testData.itemBindingNoteTypeId,
                          note: testData.items.marc.bindingNote,
                          staffOnly: false,
                        },
                        {
                          itemNoteTypeId: testData.itemReproductionNoteTypeId,
                          note: testData.items.marc.reproductionNote,
                          staffOnly: false,
                        },
                      ],
                    }).then((item) => {
                      testData.items.marc.id = item.id;
                      testData.items.marc.hrid = item.hrid;
                      testData.items.marc.barcode = itemBarcode;
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
                    holdingsStatements: [
                      {
                        statement: testData.folioHolding.holdingsStatement,
                      },
                    ],
                    notes: [
                      {
                        holdingsNoteTypeId: testData.holdingActionNoteTypeId,
                        note: testData.folioHolding.notes.actionNote,
                        staffOnly: false,
                      },
                      {
                        holdingsNoteTypeId: testData.holdingBindingNoteTypeId,
                        note: testData.folioHolding.notes.bindingNote,
                        staffOnly: false,
                      },
                      {
                        holdingsNoteTypeId: testData.holdingReproductionNoteTypeId,
                        note: testData.folioHolding.notes.reproductionNote,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
                items: [
                  {
                    barcode: `AT_C466269_FOLIO_${randomPostfix}`,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                    notes: [
                      {
                        itemNoteTypeId: testData.itemActionNoteTypeId,
                        note: testData.items.folio.actionNote,
                        staffOnly: false,
                      },
                      {
                        itemNoteTypeId: testData.itemBindingNoteTypeId,
                        note: testData.items.folio.bindingNote,
                        staffOnly: false,
                      },
                      {
                        itemNoteTypeId: testData.itemReproductionNoteTypeId,
                        note: testData.items.folio.reproductionNote,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
              }).then((createdInstanceData) => {
                holdingsIds.push(createdInstanceData.holdings[0].id);
                testData.items.folio.id = createdInstanceData.items[0].id;
                testData.items.folio.hrid = createdInstanceData.items[0].hrid;
                testData.items.folio.barcode = createdInstanceData.items[0].barcode;

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
              testData.holdingActionNoteTypeId,
              testData.holdingBindingNoteTypeId,
              testData.holdingReproductionNoteTypeId,
              testData.itemActionNoteTypeId,
              testData.itemBindingNoteTypeId,
              testData.itemReproductionNoteTypeId,
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
      'C466269 Exclude fields from Export with custom Holdings & Item profile (firebird)',
      { tags: ['extendedPath', 'firebird', 'C466269'] },
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
          `AT_C466269_CustomJobProfile_${randomPostfix}`,
          'Holdings',
        );

        // Step 3: Check the table with data export logs and download the file
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
            `AT_C466269_CustomJobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the recently created file with extension .mrc
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify exported fields for MARC and FOLIO Holdings with Items
          const suppressedFields = ['533', '563', '583'];

          const commonAssertions = (holdingsStatement, holdingsHrid, itemHrid, holdingsId) => [
            (record) => {
              suppressedFields.forEach((fieldTag) => {
                const field = record.fields.find((f) => f[0] === fieldTag);

                expect(field).to.be.undefined;
              });
            },
            (record) => expect(record.leader).to.exist,
            // Verify 999 ff is absent (suppress999ff: true)
            (record) => {
              const field999ff = record.fields.find(
                (f) => f[0] === '999' && f[1] === 'f' && f[2] === 'f',
              );

              expect(field999ff).to.be.undefined;
            },
            // Verify other fields are present: 866, 901, 902, 999 hh
            (record) => {
              const field866 = record.fields.find((f) => f[0] === '866');

              expect(field866).to.deep.eq(['866', ' 0', 'a', holdingsStatement]);
            },
            (record) => {
              const field901 = record.fields.find((f) => f[0] === '901');

              expect(field901).to.deep.eq(['901', '  ', 'a', holdingsHrid]);
            },
            (record) => {
              const field902 = record.fields.find((f) => f[0] === '902');

              expect(field902).to.deep.eq(['902', '  ', 'a', itemHrid, '3', holdingsHrid]);
            },
            (record) => {
              const field999hh = record.fields.find((f) => f[0] === '999');

              expect(field999hh).to.deep.eq(['999', 'hh', 'i', holdingsId, '3', holdingsHrid]);
            },
          ];

          const assertionsOnMarcFileContent = [
            {
              uuid: holdingsIds[0],
              assertions: commonAssertions(
                testData.marcHolding.holdingsStatement,
                holdingsHrids[0],
                testData.items.marc.hrid,
                holdingsIds[0],
              ),
            },
            {
              uuid: holdingsIds[1],
              assertions: commonAssertions(
                testData.folioHolding.holdingsStatement,
                holdingsHrids[1],
                testData.items.folio.hrid,
                holdingsIds[1],
              ),
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 2, false);
        });
      },
    );
  });
});
