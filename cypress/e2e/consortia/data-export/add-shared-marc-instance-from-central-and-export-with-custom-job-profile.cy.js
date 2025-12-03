/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { DEFAULT_JOB_PROFILE_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
  verifyLeaderPositions,
  verifyMarcFieldByFindingSubfield,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const postfix = getRandomPostfix();
const recordsCount = 3;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
  permissions.dataImportUploadAll.gui,
];
const marcFileName = 'marcBibFileForC407651.mrc';
const uploadFileName = `AT_C407651_${postfix}.mrc`;
const instanceUUIDsFileName = `AT_C407651_instanceUUIDs_${postfix}.csv`;
const customMappingProfileName = `AT_C407651_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C407651_CustomJobProfile_${postfix} export job profile`;
const testData = {
  localMarcInstance: {
    title: `AT_C407651_Local_MarcInstance_${getRandomPostfix()}`,
  },
  sharedMarcInstance: {
    title: `AT_C407651_Shared_MarcInstance_${getRandomPostfix()}`,
  },
  importedMarcInstance: {
    title: 'AT_C407651_ImportedMarcInstance.',
  },
};

// Custom mapping profile configuration function
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
      fieldId: 'instance.hrid',
      path: '$.instance.hrid',
      recordType: 'INSTANCE',
      transformation: '001  ',
      enabled: true,
    },
    {
      fieldId: 'instance.id',
      path: '$.instance.id',
      recordType: 'INSTANCE',
      transformation: '999ff$i',
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
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407651');

      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            ...userPermissions,
            permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ],
        }).then(() => {
          cy.withinTenant(Affiliations.College, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407651');

            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.materialTypeId = res.id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypeId = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });

            cy.createSimpleMarcBibViaAPI(testData.localMarcInstance.title).then((instanceId) => {
              testData.localMarcInstance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.localMarcInstance.hrid = instanceData.hrid;
              });

              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                testData.localMarcInstance.srsId = srsRecords?.matchedId;
              });

              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.localMarcInstance.uuid,
                sourceId: testData.sourceId,
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              }).then((holding) => {
                testData.localMarcInstance.holdings = {
                  id: holding.id,
                  hrid: holding.hrid,
                };

                InventoryItems.createItemViaApi({
                  barcode: `AT_C407651_local_${getRandomPostfix()}`,
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.localMarcInstance.items = {
                    id: item.id,
                    hrid: item.hrid,
                    barcode: item.barcode,
                  };
                });
              });
            });
          });

          // Create shared MARC instance in Consortia tenant
          cy.withinTenant(Affiliations.Consortia, () => {
            cy.createSimpleMarcBibViaAPI(testData.sharedMarcInstance.title).then((instanceId) => {
              testData.sharedMarcInstance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.sharedMarcInstance.hrid = instanceData.hrid;
              });

              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                testData.sharedMarcInstance.srsId = srsRecords?.matchedId;
              });
            });

            // Import MARC file in Central tenant
            DataImport.uploadFileViaApi(
              marcFileName,
              uploadFileName,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            ).then((response) => {
              testData.importedMarcInstance.uuid = response[0].instance.id;
              testData.importedMarcInstance.hrid = response[0].instance.hrid;

              cy.getSrsRecordsByInstanceId(testData.importedMarcInstance.uuid).then(
                (srsRecords) => {
                  testData.importedMarcInstance.srsId = srsRecords?.matchedId;
                },
              );
            });
          });

          // Add holdings to shared instance in College tenant
          cy.withinTenant(Affiliations.College, () => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.sharedMarcInstance.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            }).then((holding) => {
              testData.sharedMarcInstance.holdings = {
                id: holding.id,
                hrid: holding.hrid,
              };

              InventoryItems.createItemViaApi({
                barcode: `AT_C407651_shared_${getRandomPostfix()}`,
                holdingsRecordId: holding.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.sharedMarcInstance.items = {
                  id: item.id,
                  hrid: item.hrid,
                  barcode: item.barcode,
                };
              });
            });

            // Add holdings to imported instance in College tenant
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.importedMarcInstance.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            }).then((holding) => {
              testData.importedMarcInstance.holdings = {
                id: holding.id,
                hrid: holding.hrid,
              };

              InventoryItems.createItemViaApi({
                barcode: `AT_C407651_imported_${getRandomPostfix()}`,
                holdingsRecordId: holding.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.importedMarcInstance.items = {
                  id: item.id,
                  hrid: item.hrid,
                  barcode: item.barcode,
                };
              });
            });

            cy.getLocations({ limit: 1 }).then((location) => {
              cy.createMarcHoldingsViaAPI(testData.importedMarcInstance.uuid, [
                {
                  content: testData.importedMarcInstance.hrid,
                  tag: '004',
                },
                {
                  content: QuickMarcEditor.defaultValid008HoldingsValues,
                  tag: '008',
                },
                {
                  content: `$b ${location.code}`,
                  indicators: ['\\', '\\'],
                  tag: '852',
                },
              ]).then((marcHoldingId) => {
                cy.getHoldings({ query: `"id"="${marcHoldingId}"` }).then((holdings) => {
                  testData.importedMarcInstance.marcHoldings = {
                    id: holdings[0].id,
                    hrid: holdings[0].hrid,
                  };
                });
              });
            });

            const customMappingProfile = createCustomMappingProfile();

            cy.createDataExportCustomMappingProfile(customMappingProfile).then((response) => {
              testData.mappingProfileId = response.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                customJobProfileName,
                testData.mappingProfileId,
              ).then((jobResponse) => {
                testData.jobProfileId = jobResponse.body.id;
              });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        [
          testData.localMarcInstance.items.id,
          testData.sharedMarcInstance.items.id,
          testData.importedMarcInstance.items.id,
        ].forEach((itemId) => {
          InventoryItems.deleteItemViaApi(itemId);
        });
        [
          testData.localMarcInstance.holdings.id,
          testData.sharedMarcInstance.holdings.id,
          testData.importedMarcInstance.holdings.id,
          testData.importedMarcInstance.marcHoldings.id,
        ].forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });
        InventoryInstance.deleteInstanceViaApi(testData.localMarcInstance.uuid);
        ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        [testData.sharedMarcInstance.uuid, testData.importedMarcInstance.uuid].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407651 Consortia | Add shared MARC instance from central and export with Custom job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407651'] },
      () => {
        // Step 1-9: Implemented via API calls in the "before" hook
        // Create CSV file with all three instance UUIDs
        const allInstances = [
          testData.localMarcInstance,
          testData.sharedMarcInstance,
          testData.importedMarcInstance,
        ];
        const uuids = allInstances.map((instance) => instance.uuid).join('\n');

        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

        // Step 10-11: Trigger the data export and run custom job profile
        ExportFileHelper.uploadFile(instanceUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          instanceUUIDsFileName,
          `AT_C407651_CustomJobProfile_${postfix}`,
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          // Step 12: Download the recently created file
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
            `AT_C407651_CustomJobProfile_${postfix}`,
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 13-15: Verify the downloaded .mrc file includes all instances
          // Common assertions for all MARC instances
          const commonAssertions = (instance) => [
            (record) => verify001FieldValue(record, instance.hrid),
            (record) => verify005FieldValue(record),
            (record) => {
              verifyMarcFieldByTag(record, '245', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', instance.title],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                ind1: 'f',
                ind2: 'f',
                subfields: [
                  ['i', instance.uuid],
                  ['s', instance.srsId],
                ],
              });
            },
          ];

          // Assertions for created MARC instances (local and shared)
          const createdMarcAssertions = (instance) => [
            (record) => {
              verifyLeaderPositions(record, {
                5: 'n',
                6: 'a',
                7: 'a',
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '876', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', instance.items.barcode],
                  ['3', instance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', instance.holdings.hrid],
                  ['b', instance.holdings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', instance.items.hrid],
                  ['b', instance.items.id],
                  ['3', instance.holdings.hrid],
                ],
              });
            },
          ];

          // Assertions for imported MARC instance (has original MARC content + custom fields)
          const importedMarcAssertions = [
            (record) => {
              verifyLeaderPositions(record, {
                5: 'c',
                6: 'g',
                7: 'm',
              });
            },
            (record) => {
              verify008FieldValue(record, '130502s2013    xxu050            vleng d');
            },
            (record) => {
              const field007 = record.get('007');

              expect(field007[0].value).to.eq('vd cvaizq');
            },
            (record) => {
              verifyMarcFieldByTag(record, '024', {
                ind1: '1',
                ind2: ' ',
                subfields: ['a', '883929341139'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '028', {
                ind1: '4',
                ind2: '2',
                subfields: [
                  ['a', '1000403458'],
                  ['b', 'Warner Bros Ent. Canada Inc.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '037', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['b', 'Midwest Tape'],
                  ['n', 'http://www.midwesttapes.com'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '040', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'TEFMT'],
                  ['b', 'eng'],
                  ['e', 'rda'],
                  ['c', 'TEFMT'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '041', {
                ind1: '0',
                ind2: ' ',
                subfields: [
                  ['a', 'eng'],
                  ['j', 'eng'],
                  ['h', 'eng'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '043', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'e-uk---'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '046', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['k', '2011'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '050', {
                ind1: ' ',
                ind2: '4',
                subfields: [
                  ['a', 'DA112'],
                  ['b', '.C67 2013'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '082', {
                ind1: '0',
                ind2: '4',
                subfields: [
                  ['a', '941.085'],
                  ['2', '23'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '257', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'United Kingdom.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '264', {
                ind1: ' ',
                ind2: '2',
                subfields: [
                  ['a', 'Burbank, CA :'],
                  ['b', 'Distributed in the USA by Warner Home Video,'],
                  ['c', '[2013]'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '300', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', '1 videodisc (50 min.) :'],
                  ['b', 'sound, color with black and white sequences ;'],
                  ['c', '4 3/4 in. +'],
                  ['e', '1 booklet (23 cm).'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '336', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'two-dimensional moving image'],
                  ['b', 'tdi'],
                  ['2', 'rdacontent'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '337', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'video'],
                  ['b', 'v'],
                  ['2', 'rdamedia'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '338', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'videodisc'],
                  ['b', 'vd'],
                  ['2', 'rdacarrier'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '344', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'digital'],
                  ['b', 'optical'],
                  ['g', 'stereo'],
                  ['h', 'Dolby digital stereo'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '346', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'laser optical'],
                  ['b', 'NTSC'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '347', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'video file'],
                  ['b', 'DVD video'],
                  ['e', 'region 1'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '490', {
                ind1: '1',
                ind2: ' ',
                subfields: [
                  ['a', 'Royal collection ;'],
                  ['v', '[3]'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '500', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'Title from web page.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '508', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'Prducer/director, Jamie Muir ; narrator, Tamsin Greig.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '511', {
                ind1: '0',
                ind2: ' ',
                subfields: ['a', 'Queen Elizabeth II.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '520', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  'a',
                  'The coronation of Elizabeth II was an enormous logistical operation, and an event of huge cultural significance. Now, using hitherto unseen archives and with co-operation of the Palace, the diaries and papers of those at the heart of the planning are opened up to reveal the behind the scenes story of the Coronation.',
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '538', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'DVD, widescreen (16x9) presentation; stereo.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '546', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'English SDH subtitles.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '600', {
                ind1: '0',
                ind2: '0',
                subfields: [
                  ['a', 'Elizabeth'],
                  ['b', 'II,'],
                  ['c', 'Queen of Great Britain,'],
                  ['d', '1926-2022'],
                  ['x', 'Coronation.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '648', {
                ind1: ' ',
                ind2: '7',
                subfields: [
                  ['a', 'Since 1900'],
                  ['2', 'fast'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '650', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Coronations'],
                  ['z', 'Great Britain'],
                  ['x', 'History'],
                  ['y', '20th century.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '651', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Great Britain'],
                  ['x', 'Kings and rulers'],
                  ['v', 'Biography.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '655', {
                ind1: ' ',
                ind2: '2',
                subfields: ['a', 'Documentaries and Factual Films'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '700', {
                ind1: '1',
                ind2: ' ',
                subfields: ['a', 'Muir, Jamie.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '710', {
                ind1: '2',
                ind2: ' ',
                subfields: ['a', 'British Broadcasting Corporation.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '830', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Royal collection ;'],
                  ['v', '3.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '876', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.importedMarcInstance.items.barcode],
                  ['3', testData.importedMarcInstance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.importedMarcInstance.holdings.hrid],
                  ['b', testData.importedMarcInstance.holdings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '901', {
                findBySubfield: 'a',
                findByValue: testData.importedMarcInstance.marcHoldings.hrid,
                subfields: [
                  ['a', testData.importedMarcInstance.marcHoldings.hrid],
                  ['b', testData.importedMarcInstance.marcHoldings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.importedMarcInstance.items.hrid],
                  ['b', testData.importedMarcInstance.items.id],
                  ['3', testData.importedMarcInstance.holdings.hrid],
                ],
              });
            },
          ];

          const recordsToVerify = allInstances.map((instance) => {
            if (instance.uuid === testData.importedMarcInstance.uuid) {
              return {
                uuid: instance.uuid,
                assertions: [...commonAssertions(instance), ...importedMarcAssertions],
              };
            }
            return {
              uuid: instance.uuid,
              assertions: [...commonAssertions(instance), ...createdMarcAssertions(instance)],
            };
          });

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
        });
      },
    );
  });
});
