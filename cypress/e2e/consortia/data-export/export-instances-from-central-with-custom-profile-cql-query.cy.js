import permissions from '../../../support/dictionary/permissions';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME, ITEM_STATUS_NAMES } from '../../../support/constants';
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
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues,
  verifyMarcFieldByFindingSubfield,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const postfix = getRandomPostfix();
const recordsCount = 2;
const cqlFileName = `AT_C468211_instanceUUIDs_${postfix}.cql`;
const customMappingProfileName = `AT_C468211_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C468211_CustomJobProfile_${postfix} export job profile`;
const testData = {
  marcInstance: {
    title: `AT_C468211_MarcInstance_${getRandomPostfix()}`,
    isbn: '9780123456789C468211',
  },
  folioInstance: {
    title: `AT_C468211_FolioInstance_${getRandomPostfix()}`,
    isbn: '9780987654321C468211',
  },
  electronicAccess: {
    uri: 'https://example.com/resource',
    linkText: 'Example Resource Link',
    materialsSpecification: 'Resource Materials',
    publicNote: 'Public Resource Note',
  },
};

const createCustomMappingProfile = (relationshipId, isbnTypeId) => ({
  default: false,
  recordTypes: ['INSTANCE', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
  locked: false,
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
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [permissions.uiInventoryViewInstances.gui],
        }).then(() => {
          cy.withinTenant(Affiliations.College, () => {
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
            InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then(
              (identifierType) => {
                testData.isbnTypeId = identifierType.id;
              },
            );
            UrlRelationship.getViaApi({
              query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
            }).then((relationships) => {
              testData.resourceRelationshipId = relationships[0].id;
            });
          });

          cy.withinTenant(Affiliations.Consortia, () => {
            const marcInstanceFields = [
              {
                tag: '008',
                content: QuickMarcEditor.defaultValid008Values,
              },
              {
                tag: '020',
                content: `$a ${testData.marcInstance.isbn}`,
                indicators: ['\\', '\\'],
              },
              {
                tag: '245',
                content: `$a ${testData.marcInstance.title}`,
                indicators: ['0', '0'],
              },
            ];

            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              testData.marcInstance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.marcInstance.hrid = instanceData.hrid;
              });
            });

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.folioInstance.title,
                  identifiers: [
                    {
                      identifierTypeId: testData.isbnTypeId,
                      value: testData.folioInstance.isbn,
                    },
                  ],
                },
              }).then((createdInstanceData) => {
                testData.folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(testData.folioInstance.uuid).then((instanceData) => {
                  testData.folioInstance.hrid = instanceData.hrid;
                });
              });
            });
          });

          cy.withinTenant(Affiliations.College, () => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
              electronicAccess: [
                {
                  relationshipId: testData.resourceRelationshipId,
                  uri: testData.electronicAccess.uri,
                  linkText: testData.electronicAccess.linkText,
                  materialsSpecification: testData.electronicAccess.materialsSpecification,
                  publicNote: testData.electronicAccess.publicNote,
                },
              ],
            }).then((holding) => {
              testData.marcInstance.holdings = {
                id: holding.id,
                hrid: holding.hrid,
              };

              InventoryItems.createItemViaApi({
                barcode: `AT_C468211_marc_${getRandomPostfix()}`,
                holdingsRecordId: holding.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.marcInstance.items = {
                  id: item.id,
                  hrid: item.hrid,
                  barcode: item.barcode,
                };
              });
            });

            cy.getLocations({ limit: 1 }).then((location) => {
              cy.createMarcHoldingsViaAPI(testData.marcInstance.uuid, [
                {
                  content: testData.marcInstance.hrid,
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
                {
                  tag: '856',
                  content: `$z ${testData.electronicAccess.publicNote} $u ${testData.electronicAccess.uri} $3 ${testData.electronicAccess.materialsSpecification} $y ${testData.electronicAccess.linkText}`,
                  indicators: ['4', '0'],
                },
              ]).then((marcHoldingId) => {
                testData.marcInstance.marcHoldings = {
                  id: marcHoldingId,
                };

                cy.getHoldings({ limit: 1, query: `"id"=="${marcHoldingId}"` }).then(
                  (holdingsRecords) => {
                    testData.marcInstance.marcHoldings.hrid = holdingsRecords[0].hrid;
                  },
                );

                InventoryItems.createItemViaApi({
                  barcode: `AT_C468211_marc_holding_${getRandomPostfix()}`,
                  holdingsRecordId: marcHoldingId,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.marcInstance.marcHoldingItems = {
                    id: item.id,
                    hrid: item.hrid,
                    barcode: item.barcode,
                  };
                });
              });
            });

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
              electronicAccess: [
                {
                  relationshipId: testData.resourceRelationshipId,
                  uri: testData.electronicAccess.uri,
                  linkText: testData.electronicAccess.linkText,
                  materialsSpecification: testData.electronicAccess.materialsSpecification,
                  publicNote: testData.electronicAccess.publicNote,
                },
              ],
            }).then((holding) => {
              testData.folioInstance.holdings = {
                id: holding.id,
                hrid: holding.hrid,
              };

              InventoryItems.createItemViaApi({
                barcode: `AT_C468211_folio_${getRandomPostfix()}`,
                holdingsRecordId: holding.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.folioInstance.items = {
                  id: item.id,
                  hrid: item.hrid,
                  barcode: item.barcode,
                };
              });
            });
          });

          cy.then(() => {
            const customMappingProfile = createCustomMappingProfile(
              testData.resourceRelationshipId,
              testData.isbnTypeId,
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
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        [
          testData.marcInstance.items.id,
          testData.marcInstance.marcHoldingItems.id,
          testData.folioInstance.items.id,
        ].forEach((itemId) => {
          InventoryItems.deleteItemViaApi(itemId);
        });
        [
          testData.marcInstance.holdings.id,
          testData.marcInstance.marcHoldings.id,
          testData.folioInstance.holdings.id,
        ].forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);

        [testData.marcInstance.uuid, testData.folioInstance.uuid].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });

        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${cqlFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C468211 ECS | Export Instances from Central tenant with custom Instance & Holdings & Item profile (file with cql query) (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C468211'] },
      () => {
        const cqlQuery = `(id=="${testData.marcInstance.uuid}" or id=="${testData.folioInstance.uuid}") sortby title`;

        FileManager.createFile(`cypress/fixtures/${cqlFileName}`, cqlQuery);
        ExportFileHelper.uploadFile(cqlFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          cqlFileName,
          `AT_C468211_CustomJobProfile_${postfix}`,
          'Instances',
          '.cql',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${cqlFileName.replace('.cql', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
            `AT_C468211_CustomJobProfile_${postfix}`,
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          cy.getUserToken(user.username, user.password);

          // MARC instance has 2 holdings (FOLIO + MARC) and 2 items
          const marcInstanceAssertions = [
            (record) => verify001FieldValue(record, testData.marcInstance.hrid),
            (record) => {
              verifyMarcFieldByTag(record, '020', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', testData.marcInstance.isbn],
              });
            },
            (record) => {
              verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '856', {
                ind1: '4',
                ind2: '0',
                expectedCount: 2,
                subfields: [
                  ['u', testData.electronicAccess.uri],
                  ['y', testData.electronicAccess.linkText],
                  ['z', testData.electronicAccess.publicNote],
                  ['3', testData.electronicAccess.materialsSpecification],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '876', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.items.barcode,
                subfields: [
                  ['a', testData.marcInstance.items.barcode],
                  ['3', testData.marcInstance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '876', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.marcHoldingItems.barcode,
                subfields: [
                  ['a', testData.marcInstance.marcHoldingItems.barcode],
                  ['3', testData.marcInstance.marcHoldings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '901', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.holdings.hrid,
                subfields: [
                  ['a', testData.marcInstance.holdings.hrid],
                  ['b', testData.marcInstance.holdings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '901', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.marcHoldings.hrid,
                subfields: [
                  ['a', testData.marcInstance.marcHoldings.hrid],
                  ['b', testData.marcInstance.marcHoldings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '902', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.items.hrid,
                subfields: [
                  ['a', testData.marcInstance.items.hrid],
                  ['b', testData.marcInstance.items.id],
                  ['3', testData.marcInstance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '902', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: testData.marcInstance.marcHoldingItems.hrid,
                subfields: [
                  ['a', testData.marcInstance.marcHoldingItems.hrid],
                  ['b', testData.marcInstance.marcHoldingItems.id],
                  ['3', testData.marcInstance.marcHoldings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '999', {
                ind1: 'f',
                ind2: 'f',
                subfields: ['i', testData.marcInstance.uuid],
              });
            },
          ];

          // FOLIO instance has 1 holding and 1 item
          const folioInstanceAssertions = [
            (record) => verify001FieldValue(record, testData.folioInstance.hrid),
            (record) => {
              verifyMarcFieldByTag(record, '020', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', testData.folioInstance.isbn],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '856', {
                ind1: '4',
                ind2: '0',
                subfields: [
                  ['u', testData.electronicAccess.uri],
                  ['y', testData.electronicAccess.linkText],
                  ['z', testData.electronicAccess.publicNote],
                  ['3', testData.electronicAccess.materialsSpecification],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '876', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.folioInstance.items.barcode],
                  ['3', testData.folioInstance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.folioInstance.holdings.hrid],
                  ['b', testData.folioInstance.holdings.id],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', testData.folioInstance.items.hrid],
                  ['b', testData.folioInstance.items.id],
                  ['3', testData.folioInstance.holdings.hrid],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '999', {
                ind1: 'f',
                ind2: 'f',
                subfields: ['i', testData.folioInstance.uuid],
              });
            },
          ];

          const recordsToVerify = [
            {
              uuid: testData.marcInstance.uuid,
              assertions: marcInstanceAssertions,
            },
            {
              uuid: testData.folioInstance.uuid,
              assertions: folioInstanceAssertions,
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount, false);
        });
      },
    );
  });
});
