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
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
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
const csvFileName = `AT_C11086_instancesWithHoldings_${randomPostfix}.csv`;
const customMappingProfileName = `AT_C11086_CustomMappingProfile_${randomPostfix}`;
const customJobProfileName = `AT_C11086_CustomJobProfile_${randomPostfix} export job profile`;
const folioInstanceTitle = `AT_C11086_FolioInstance_${randomPostfix}`;
const marcInstanceTitle = `AT_C11086_MarcInstance_${randomPostfix}`;
const folioInstanceWithoutHoldingsTitle = `AT_C11086_FolioInstanceWithoutHoldings_${randomPostfix}`;
const testData = {
  allUUIDs: [],
  itemBarcode: `AT_C11086_${randomPostfix}`,
  folioISBN: '9780123456789',
  marcISBN: '9780987654321',
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
  instances: {
    folio: { holdings: {}, items: {} },
    marc: { holdings: {}, items: {} },
    folioWithoutHoldings: {},
  },
};

// Custom mapping profile configuration function
const createCustomMappingProfile = (relationshipId, isbnTypeId) => ({
  default: false,
  recordTypes: ['INSTANCE', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
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
      fieldId: 'instance.identifiers.isbn',
      path: `$.instance.identifiers[?(@.identifierTypeId=='${isbnTypeId}')].value`,
      recordType: 'INSTANCE',
      transformation: '020  $a',
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
          .then((instanceTypeData) => {
            testData.instanceTypeId = instanceTypeData[0].id;
          })
          .then(() => {
            InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then(
              (identifierType) => {
                testData.isbnIdentifierTypeId = identifierType.id;
              },
            );
          })
          .then(() => {
            UrlRelationship.getViaApi({
              query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
            }).then((relationships) => {
              testData.resourceRelationshipId = relationships[0].id;
            });
          })
          .then(() => {
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
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: folioInstanceTitle,
                identifiers: [
                  {
                    identifierTypeId: testData.isbnIdentifierTypeId,
                    value: testData.folioISBN,
                    typeName: 'ISBN',
                  },
                ],
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
            }).then((createdInstanceData) => {
              testData.instances.folio.uuid = createdInstanceData.instanceId;
              testData.instances.folio.holdings.id = createdInstanceData.holdings[0].id;
              testData.instances.folio.items.id = createdInstanceData.items[0].id;
              testData.instances.folio.items.hrid = createdInstanceData.items[0].hrid;

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${createdInstanceData.instanceId}"`,
              }).then((holdings) => {
                testData.instances.folio.holdings.hrid = holdings[0].hrid;
              });

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                testData.instances.folio.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            const marcInstanceFields = [
              {
                tag: '008',
                content: QuickMarcEditor.defaultValid008Values,
              },
              {
                tag: '020',
                content: `$a ${testData.marcISBN}`,
                indicators: ['\\', '\\'],
              },
              {
                tag: '245',
                content: `$a ${marcInstanceTitle}`,
                indicators: ['1', '0'],
              },
            ];

            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
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
            }).then((createdInstanceData) => {
              testData.instances.folioWithoutHoldings.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                testData.instances.folioWithoutHoldings.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            const customMappingProfile = createCustomMappingProfile(
              testData.resourceRelationshipId,
              testData.isbnIdentifierTypeId,
            );

            cy.createDataExportCustomMappingProfile(customMappingProfile).then((response) => {
              testData.mappingProfileId = response.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                customJobProfileName,
                testData.mappingProfileId,
              ).then((jobResponse) => {
                testData.jobProfileId = jobResponse.body.id;
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

      testData.allUUIDs.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });

      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C11086 Verify a mapping profile with inventory instance, holdings and item transformations (firebird)',
      { tags: ['extendedPath', 'firebird', 'C11086'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button and submitting .csv file with Instances UUIDs
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Custom job profile created in Preconditions by clicking on it > Specify "instances" type > Click on "Run" button
        ExportFileHelper.exportWithDefaultJobProfile(
          csvFileName,
          `AT_C11086_CustomJobProfile_${randomPostfix}`,
        );

        // Step 3: Check the table with data export logs on the "Logs" main page
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
            `AT_C11086_CustomJobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the recently created file with extension .mrc by clicking on a file name
          DataExportLogs.clickButtonWithText(testData.resultFileName);

          // Step 5-6: Verify export completed successfully with custom transformations
          // Verify MARC field mappings according to the custom mapping profile
          const absentTags = ['005', '008', '245'];
          const missingHoldingsItemTags = ['856', '876', '901', '902'];
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instances.folio.uuid,
              assertions: [
                (record) => expect(record.get('001')[0].value).to.eq(testData.instances.folio.hrid),
                (record) => {
                  expect(record.fields.find((f) => f[0] === '020')).to.deep.eq([
                    '020',
                    '  ',
                    'a',
                    testData.folioISBN,
                  ]);
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
                  const field876 = record.fields.find((f) => f[0] === '876');
                  expect(field876).to.deep.eq([
                    '876',
                    '  ',
                    'a',
                    testData.itemBarcode,
                    '3',
                    testData.instances.folio.holdings.hrid,
                  ]);
                },
                (record) => {
                  const field901 = record.fields.find((f) => f[0] === '901');
                  expect(field901).to.deep.eq([
                    '901',
                    '  ',
                    'a',
                    testData.instances.folio.holdings.hrid,
                    'b',
                    testData.instances.folio.holdings.id,
                  ]);
                },
                (record) => {
                  const field902 = record.fields.find((f) => f[0] === '902');
                  expect(field902).to.deep.eq([
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
                  const field999 = record.fields.find((f) => f[0] === '999');
                  expect(field999).to.deep.eq(['999', 'ff', 'i', testData.instances.folio.uuid]);
                },
                (record) => {
                  absentTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
                },
              ],
            },
            {
              uuid: testData.instances.marc.uuid,
              assertions: [
                (record) => expect(record.get('001')[0].value).to.eq(testData.instances.marc.hrid),
                (record) => {
                  expect(record.fields.find((f) => f[0] === '020')).to.deep.eq([
                    '020',
                    '  ',
                    'a',
                    testData.marcISBN,
                  ]);
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
                  expect(record.fields.find((f) => f[0] === '999')).to.deep.eq([
                    '999',
                    'ff',
                    'i',
                    testData.instances.marc.uuid,
                  ]);
                },
                (record) => {
                  absentTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
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
                (record) => expect(record.fields.find((f) => f[0] === '020')).to.be.undefined,
                (record) => {
                  expect(record.fields.find((f) => f[0] === '999')).to.deep.eq([
                    '999',
                    'ff',
                    'i',
                    testData.instances.folioWithoutHoldings.uuid,
                  ]);
                },
                (record) => {
                  missingHoldingsItemTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
                },
                (record) => {
                  absentTags.forEach(
                    (tag) => expect(record.fields.find((f) => f[0] === tag)).to.be.undefined,
                  );
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            testData.resultFileName,
            assertionsOnMarcFileContent,
            totalRecordsCount,
            false,
          );
        });
      },
    );
  });
});
