import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { HOLDING_NOTE_TYPES, ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
const randomPostfix = getRandomPostfix();
const csvFileName = `AT_C345414_instanceWithLargeHoldings_${randomPostfix}.csv`;
const customMappingProfileName = `AT_C345414_CustomMappingProfile_${randomPostfix}`;
const customJobProfileName = `AT_C345414_CustomJobProfile_${randomPostfix} export job profile`;
const marcInstanceTitle = `AT_C345414_MarcInstance_${randomPostfix}`;
let longNoteText;
const testData = {
  marcInstance: {},
  holdings: {},
  item: {},
};

// Custom mapping profile with Holdings and Items transformations
const createCustomMappingProfile = () => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
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
      fieldId: 'holdings.holdingnotetypeid.action.note',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.actionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53200$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.binding',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.bindingNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53300$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.reproduction',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.reproductionNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53500$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.copy.note',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.copyNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53400$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.electronic.bookplate',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.electronicBookplateNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53600$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.provenance',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.provenanceNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53700$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.holdingnotetypeid.note',
      path: `$.holdings[*].notes[?(@.holdingsNoteTypeId=='${testData.noteNoteTypeId}' && (!(@.staffOnly) || @.staffOnly == false))].note`,
      recordType: 'HOLDINGS',
      transformation: '53800$a',
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
// Helper function to create holding notes
const createHoldingNotes = (noteTypeIds, noteText) => {
  return noteTypeIds.map((noteTypeId) => ({
    holdingsNoteTypeId: noteTypeId,
    note: noteText,
    staffOnly: false,
  }));
};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.readFile('cypress/fixtures/C345414_long_holdings_note.txt').then(
          (fileContent) => {
            longNoteText = fileContent;
          },
        );

        // Get all holding note type IDs
        const holdingNoteTypes = [
          { type: HOLDING_NOTE_TYPES.REPRODUCTION, key: 'reproductionNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.ACTION_NOTE, key: 'actionNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.BINDING, key: 'bindingNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.COPY_NOTE, key: 'copyNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE, key: 'electronicBookplateNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.PROVENANCE, key: 'provenanceNoteTypeId' },
          { type: HOLDING_NOTE_TYPES.NOTE, key: 'noteNoteTypeId' },
        ];
        holdingNoteTypes.forEach(({ type, key }) => {
          cy.getHoldingNoteTypeIdViaAPI(type).then((id) => {
            testData[key] = id;
          });
        });
        InventoryInstances.getItemNoteTypes({ limit: 1 }).then((noteTypes) => {
          testData.itemNoteTypeId = noteTypes[0].id;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((locations) => {
          testData.locationId = locations.id;
        });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingSources) => {
          testData.sourceId = holdingSources[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 })
          .then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
          })
          .then(() => {
            // Create simple MARC bib instance
            cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((instanceId) => {
              testData.marcInstance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.marcInstance.hrid = instanceData.hrid;
                testData.marcInstance.title = instanceData.title;

                // Create holdings record with multiple long notes
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  sourceId: testData.sourceId,
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                  notes: createHoldingNotes(
                    [
                      testData.reproductionNoteTypeId,
                      testData.actionNoteTypeId,
                      testData.bindingNoteTypeId,
                      testData.copyNoteTypeId,
                      testData.electronicBookplateNoteTypeId,
                      testData.provenanceNoteTypeId,
                      testData.noteNoteTypeId,
                    ],
                    longNoteText,
                  ),
                }).then((holding) => {
                  testData.holdings.id = holding.id;
                  testData.holdings.hrid = holding.hrid;

                  // Create item with notes
                  InventoryItems.createItemViaApi({
                    barcode: `AT_C345414_${randomPostfix}`,
                    holdingsRecordId: holding.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    notes: [
                      {
                        itemNoteTypeId: testData.itemNoteTypeId,
                        note: longNoteText,
                        staffOnly: false,
                      },
                      {
                        itemNoteTypeId: testData.itemNoteTypeId,
                        note: longNoteText,
                        staffOnly: false,
                      },
                    ],
                  }).then((item) => {
                    testData.item.id = item.id;
                    testData.item.hrid = item.hrid;
                  });
                });
              });
            });
          })
          .then(() => {
            // Create custom mapping profile
            const customMappingProfile = createCustomMappingProfile();

            cy.createDataExportCustomMappingProfile(customMappingProfile).then((response) => {
              testData.mappingProfileId = response.id;

              // Create custom job profile
              ExportNewJobProfile.createNewJobProfileViaApi(
                customJobProfileName,
                testData.mappingProfileId,
              ).then((jobResponse) => {
                testData.jobProfileId = jobResponse.body.id;
              });
            });
          })
          .then(() => {
            // Create CSV file with instance UUID
            FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.marcInstance.uuid);
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstance.uuid);
      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C345414 Gracefully handle export of the records that exceed MARC record size (firebird)',
      { tags: ['extendedPath', 'firebird', 'C345414'] },
      () => {
        // Step 1: Export a large record using custom job/mapping profiles with holdings and items data
        ExportFile.uploadFile(csvFileName);
        ExportFile.exportWithDefaultJobProfile(
          csvFileName,
          `AT_C345414_CustomJobProfile_${randomPostfix}`,
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            1,
            jobId,
            user.username,
            `AT_C345414_CustomJobProfile_${randomPostfix}`,
          );
          cy.getUserToken(user.username, user.password);
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const formattedDateUpToHours = new Date().toISOString().slice(0, 13);
          const errorMessages = [
            `"Instance UUID": "${testData.marcInstance.uuid}"`,
            `"Instance HRID": "${testData.marcInstance.hrid}"`,
            `"Instance Title": "${testData.marcInstance.title}"`,
            new RegExp(
              `"Inventory record link": (${Cypress.config('baseUrl')})?/inventory/view/${testData.marcInstance.uuid}`,
            ),
          ];

          errorMessages.forEach((error) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(error);
          });

          const errorPattern = new RegExp(
            `${formattedDateUpToHours}.*ERROR Record is too long to be a valid MARC binary record, it's length would be \\d+ which is more thatn 99999 bytes`,
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(errorPattern);
        });
      },
    );
  });
});
