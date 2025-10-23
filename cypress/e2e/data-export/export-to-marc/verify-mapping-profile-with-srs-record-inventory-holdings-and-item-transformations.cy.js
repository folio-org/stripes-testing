/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { ITEM_STATUS_NAMES, ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../support/constants';

let user;
const randomPostfix = getRandomPostfix();
const csvFileName = `AT_C196759_instances_${randomPostfix}.csv`;
const mappingProfileName = `AT_C196759_MappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C196759_JobProfile_${randomPostfix} export job profile`;
const folioInstanceTitle = `AT_C196759_FolioInstance_${randomPostfix}`;
const folioInstanceWithoutHoldingsTitle = `AT_C196759_FolioInstance_NoHoldings_${randomPostfix}`;
const marcInstanceTitle = `AT_C196759_MarcInstance_${randomPostfix}`;
const testData = {
  allUUIDs: [],
  itemBarcode: `AT_C196759_${randomPostfix}`,
  instances: {
    folio: { holdings: {}, items: {} },
    marc: { holdings: {}, items: {} },
    folioWithoutHoldings: {},
  },
  electronicAccess: {
    folio: {
      uri: 'https://example.com/folio',
      linkText: 'FOLIO Link Text',
      materialsSpecification: 'FOLIO Materials',
      publicNote: 'FOLIO Public Note',
    },
    marc: {
      uri: 'https://example.com/marc',
      linkText: 'MARC Link Text',
      materialsSpecification: 'MARC Materials',
      publicNote: 'MARC Public Note',
    },
  },
};

const createMappingProfile = (relationshipId) => ({
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
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((types) => {
            testData.instanceTypeId = types[0].id;
          })
          .then(() => {
            UrlRelationship.getViaApi({
              query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
            }).then((relationships) => {
              testData.resourceRelationshipId = relationships[0].id;
            });
          })
          .then(() => {
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
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: folioInstanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                  electronicAccess: [
                    {
                      relationshipId: testData.resourceRelationshipId,
                      uri: testData.electronicAccess.folio.uri,
                      linkText: testData.electronicAccess.folio.linkText,
                      materialsSpecification:
                        testData.electronicAccess.folio.materialsSpecification,
                      publicNote: testData.electronicAccess.folio.publicNote,
                    },
                  ],
                },
              ],
              items: [
                {
                  barcode: testData.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((created) => {
              testData.instances.folio.uuid = created.instanceId;
              testData.instances.folio.holdings.id = created.holdings[0].id;
              testData.instances.folio.items.id = created.items[0].id;
              testData.instances.folio.items.hrid = created.items[0].hrid;

              cy.getHoldings({ limit: 1, query: `"instanceId"="${created.instanceId}"` }).then(
                (holdings) => {
                  testData.instances.folio.holdings.hrid = holdings[0].hrid;
                },
              );

              cy.getInstanceById(created.instanceId).then((instanceData) => {
                testData.instances.folio.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((instanceId) => {
              testData.instances.marc.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.instances.marc.hrid = instanceData.hrid;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  sourceId: testData.sourceId,
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                  electronicAccess: [
                    {
                      relationshipId: testData.resourceRelationshipId,
                      uri: testData.electronicAccess.marc.uri,
                      linkText: testData.electronicAccess.marc.linkText,
                      materialsSpecification: testData.electronicAccess.marc.materialsSpecification,
                      publicNote: testData.electronicAccess.marc.publicNote,
                    },
                  ],
                }).then((holding) => {
                  testData.instances.marc.holdings.id = holding.id;
                  testData.instances.marc.holdings.hrid = holding.hrid;

                  InventoryItems.createItemViaApi({
                    barcode: `${testData.itemBarcode}_marc`,
                    holdingsRecordId: holding.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    testData.instances.marc.items.id = item.id;
                    testData.instances.marc.items.hrid = item.hrid;
                  });
                });
              });
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: folioInstanceWithoutHoldingsTitle,
              },
              holdings: [],
              items: [],
            }).then((created) => {
              testData.instances.folioWithoutHoldings.uuid = created.instanceId;

              cy.getInstanceById(created.instanceId).then((instanceData) => {
                testData.instances.folioWithoutHoldings.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            const mappingProfile = createMappingProfile(testData.resourceRelationshipId);

            cy.createDataExportCustomMappingProfile(mappingProfile).then((resp) => {
              testData.mappingProfileId = resp.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                jobProfileName,
                testData.mappingProfileId,
              ).then((jobResp) => {
                testData.jobProfileId = jobResp.body.id;
              });
            });
          })
          .then(() => {
            testData.allUUIDs = [
              testData.instances.folio.uuid,
              testData.instances.marc.uuid,
              testData.instances.folioWithoutHoldings.uuid,
            ];

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.allUUIDs.join('\n'));
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

      testData.allUUIDs.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });

      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C196759 Verify a mapping profile with SRS record, inventory holdings and item transformations (firebird)',
      { tags: ['extendedPath', 'firebird', 'C196759'] },
      () => {
        // Step 1: Upload CSV with instance UUIDs
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run custom job profile
        ExportFileHelper.exportWithCreatedJobProfile(csvFileName, jobProfileName);

        // Step 3: Wait for job completion and verify logs table
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = testData.allUUIDs.length;
          testData.resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            testData.resultFileName,
            totalRecordsCount,
            jobId,
            user.username,
            `AT_C196759_JobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download resulting .mrc file
          DataExportLogs.clickButtonWithText(testData.resultFileName);

          // Step 5 & 6: Verify MARC records content according to mapping profile (Holdings + Item transformations). SRS bib: ensure original tags present.
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instances.folio.uuid,
              assertions: [
                (record) => expect(record.get('001')[0].value).to.eq(testData.instances.folio.hrid),
                (record) => {
                  const field245 = record.fields.find((f) => f[0] === '245');
                  expect(field245).to.deep.eq(['245', '00', 'a', folioInstanceTitle]);
                },
                (record) => {
                  const field856 = record.fields.find((f) => f[0] === '856');
                  expect(field856).to.deep.eq([
                    '856',
                    '40',
                    'u',
                    testData.electronicAccess.folio.uri,
                    'y',
                    testData.electronicAccess.folio.linkText,
                    'z',
                    testData.electronicAccess.folio.publicNote,
                    '3',
                    testData.electronicAccess.folio.materialsSpecification,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '876')).to.deep.eq([
                    '876',
                    '  ',
                    'a',
                    testData.itemBarcode,
                    '3',
                    testData.instances.folio.holdings.hrid,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '901')).to.deep.eq([
                    '901',
                    '  ',
                    'a',
                    testData.instances.folio.holdings.hrid,
                    'b',
                    testData.instances.folio.holdings.id,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '902')).to.deep.eq([
                    '902',
                    '  ',
                    'a',
                    testData.instances.folio.items.hrid,
                    'b',
                    testData.instances.folio.items.id,
                    '3',
                    testData.instances.folio.holdings.hrid,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '999')).to.deep.eq([
                    '999',
                    'ff',
                    'i',
                    testData.instances.folio.uuid,
                  ]);
                },
              ],
            },
            {
              uuid: testData.instances.marc.uuid,
              assertions: [
                (record) => expect(record.get('001')[0].value).to.eq(testData.instances.marc.hrid),
                (record) => {
                  const field245 = record.fields.find((f) => f[0] === '245');
                  expect(field245).to.deep.eq(['245', '  ', 'a', marcInstanceTitle]);
                },
                (record) => {
                  const field856 = record.fields.find((f) => f[0] === '856');
                  expect(field856).to.deep.eq([
                    '856',
                    '40',
                    'u',
                    testData.electronicAccess.marc.uri,
                    'y',
                    testData.electronicAccess.marc.linkText,
                    'z',
                    testData.electronicAccess.marc.publicNote,
                    '3',
                    testData.electronicAccess.marc.materialsSpecification,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '876')).to.deep.eq([
                    '876',
                    '  ',
                    'a',
                    `${testData.itemBarcode}_marc`,
                    '3',
                    testData.instances.marc.holdings.hrid,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '901')).to.deep.eq([
                    '901',
                    '  ',
                    'a',
                    testData.instances.marc.holdings.hrid,
                    'b',
                    testData.instances.marc.holdings.id,
                  ]);
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '902')).to.deep.eq([
                    '902',
                    '  ',
                    'a',
                    testData.instances.marc.items.hrid,
                    'b',
                    testData.instances.marc.items.id,
                    '3',
                    testData.instances.marc.holdings.hrid,
                  ]);
                },
                (record) => {
                  const field999 = record.get('999')[0];

                  expect(field999.subf[0][0]).to.eq('i');
                  expect(field999.subf[0][1]).to.eq(testData.instances.marc.uuid);
                  expect(field999.subf[1][0]).to.eq('s');
                },
              ],
            },
            {
              uuid: testData.instances.folioWithoutHoldings.uuid,
              assertions: [
                (record) => {
                  expect(record.get('001')[0].value).to.eq(
                    testData.instances.folioWithoutHoldings.hrid,
                  );
                },
                (record) => {
                  const field245 = record.fields.find((f) => f[0] === '245');
                  expect(field245).to.deep.eq([
                    '245',
                    '00',
                    'a',
                    folioInstanceWithoutHoldingsTitle,
                  ]);
                },
                (record) => {
                  ['856', '876', '901', '902'].forEach((tag) => {
                    expect(record.fields.find((f) => f[0] === tag)).to.be.undefined;
                  });
                },
                (record) => {
                  expect(record.fields.find((f) => f[0] === '999')).to.deep.eq([
                    '999',
                    'ff',
                    'i',
                    testData.instances.folioWithoutHoldings.uuid,
                  ]);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            testData.resultFileName,
            assertionsOnMarcFileContent,
            totalRecordsCount,
          );
        });
      },
    );
  });
});
