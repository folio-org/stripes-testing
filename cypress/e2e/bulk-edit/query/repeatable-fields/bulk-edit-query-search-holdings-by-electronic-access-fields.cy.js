import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
const electronicAccessTypesIds = {};
const folioInstance = {
  title: `AT_C805787_FolioInstance_${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};

const getHoldingsElectronicAccessData = (resourceId, relatedResourceId, versionOfResourceId) => [
  {
    // Holdings 1
    electronicAccess: [
      {
        uri: 'ftp://harvarda.harvard.edu',
        linkText: 'Electronic resource (PDF)',
        materialsSpecification: 'Table of contents',
        publicNote:
          'FTP access to PostScript version includes groups of article files with .pdf extension',
        relationshipId: resourceId,
      },
    ],
  },
  {
    // Holdings 2 - multiple electronic access entries
    electronicAccess: [
      {
        uri: 'http://susdl.fcla.edu',
        linkText: 'Electronic resource (JPEG)',
        materialsSpecification: 'Table of contents',
        publicNote:
          'HTTP access to PostScript version includes groups of article files with .jpeg extension',
        relationshipId: resourceId,
      },
      {
        uri: 'ftp://harvarda.harvard.edu',
        linkText: 'Electronic resource (PNG)',
        materialsSpecification: 'Volume 1',
        publicNote:
          'FTP access to PostScript version includes groups of article files with .png extension',
        relationshipId: relatedResourceId,
      },
      {
        uri: 'telnet://maine.maine.edu',
        linkText: 'Electronic resource (PDF)',
        materialsSpecification: 'Volume 2',
        publicNote:
          'TELNET access to PostScript version includes groups of article files with .pdf extension',
        relationshipId: versionOfResourceId,
      },
    ],
  },
  {
    // Holdings 3
    electronicAccess: [
      {
        uri: 'telnet://maine.maine.edu',
        linkText: '',
        materialsSpecification: 'content',
        publicNote: 'access to PostScript version',
        relationshipId: versionOfResourceId,
      },
    ],
  },
  {
    // Holdings 4 - no electronic access
    electronicAccess: [],
  },
];

// Helper function to verify electronic access data in the query modal
const verifyElectronicAccessInQueryModal = (holding) => {
  QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
    holding.hrid,
    holding.electronicAccess,
  );
};

// Function to create expected holdings array with transformed electronic access data
const createExpectedHoldings = (holdingHrids) => [
  {
    hrid: holdingHrids[0],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        uri: 'ftp://harvarda.harvard.edu',
        linkText: 'Electronic resource (PDF)',
        materialsSpecified: 'Table of contents',
        publicNote:
          'FTP access to PostScript version includes groups of article files with .pdf extension',
      },
    ],
  },
  {
    hrid: holdingHrids[1],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        uri: 'http://susdl.fcla.edu',
        linkText: 'Electronic resource (JPEG)',
        materialsSpecified: 'Table of contents',
        publicNote:
          'HTTP access to PostScript version includes groups of article files with .jpeg extension',
        miniRowIndex: 3,
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
        uri: 'ftp://harvarda.harvard.edu',
        linkText: 'Electronic resource (PNG)',
        materialsSpecified: 'Volume 1',
        publicNote:
          'FTP access to PostScript version includes groups of article files with .png extension',
        miniRowIndex: 2,
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
        uri: 'telnet://maine.maine.edu',
        linkText: 'Electronic resource (PDF)',
        materialsSpecified: 'Volume 2',
        publicNote:
          'TELNET access to PostScript version includes groups of article files with .pdf extension',
        miniRowIndex: 1,
      },
    ],
  },
  {
    hrid: holdingHrids[2],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
        uri: 'telnet://maine.maine.edu',
        linkText: '',
        materialsSpecified: 'content',
        publicNote: 'access to PostScript version',
      },
    ],
  },
  {
    hrid: holdingHrids[3],
    electronicAccess: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805787');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get URL relationship IDs
          UrlRelationship.getViaApi({
            query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
          }).then((resourceRelData) => {
            electronicAccessTypesIds.resourceRelationshipId = resourceRelData[0].id;
          });

          UrlRelationship.getViaApi({
            query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE}"`,
          }).then((relatedResourceRelData) => {
            electronicAccessTypesIds.relatedResourceRelationshipId = relatedResourceRelData[0].id;
          });

          UrlRelationship.getViaApi({
            query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE}"`,
          }).then((versionOfResourceRelData) => {
            electronicAccessTypesIds.versionOfResourceRelationshipId =
              versionOfResourceRelData[0].id;

            const holdingsElectronicAccessData = getHoldingsElectronicAccessData(
              electronicAccessTypesIds.resourceRelationshipId,
              electronicAccessTypesIds.relatedResourceRelationshipId,
              electronicAccessTypesIds.versionOfResourceRelationshipId,
            );

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypeData) => {
              holdingTypeId = holdingTypeData[0].id;
            });
            cy.getLocations({ limit: 1 })
              .then((location) => {
                locationId = location.id;
              })
              .then(() => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((createdInstance) => {
                  folioInstance.id = createdInstance.instanceId;

                  InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                    const sourceId = folioSource.id;

                    // Create holdings with electronic access
                    holdingsElectronicAccessData.forEach((holdingData) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: folioInstance.id,
                        permanentLocationId: locationId,
                        holdingsTypeId: holdingTypeId,
                        sourceId,
                        electronicAccess: holdingData.electronicAccess,
                      }).then((createdHolding) => {
                        cy.getHoldings({ query: `id=${createdHolding.id}` }).then(
                          (holdingResponse) => {
                            folioInstance.holdingHrids.push(holdingResponse[0].hrid);
                          },
                        );
                      });
                    });
                  });
                });
              });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      });

      it(
        'C805787 Search holdings by Electronic access fields using AND operator (firebird)',
        { tags: ['smoke', 'firebird', 'C805787'] },
        () => {
          // Create expected holdings for verification
          const expectedHoldings = createExpectedHoldings(folioInstance.holdingHrids);

          // Step 1: Verify Electronic access fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          [
            holdingsFieldValues.electronicAccessLinkText,
            holdingsFieldValues.electronicAccessMaterialSpecified,
            holdingsFieldValues.electronicAccessURI,
            holdingsFieldValues.electronicAccessURLPublicNote,
            holdingsFieldValues.electronicAccessURLRelationship,
          ].forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifyFieldsSortedAlphabetically();
          QueryModal.clickSelectFieldButton();

          // Step 2: Search holdings by "Holdings — Electronic access — URL relationship", "Holdings — Electronic access — URI" fields using AND operator
          QueryModal.selectField(holdingsFieldValues.electronicAccessURLRelationship);
          QueryModal.verifySelectedField(holdingsFieldValues.electronicAccessURLRelationship);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('Resource');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.electronicAccessURI, 1);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.fillInValueTextfield('harvarda.harvard.edu', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Electronic access');
          QueryModal.clickShowColumnsButton();

          const expectedHoldingsToFind = [expectedHoldings[0], expectedHoldings[1]];

          expectedHoldingsToFind.forEach((holding) => {
            verifyElectronicAccessInQueryModal(holding);
          });

          const notExpectedToFindHoldingHrids = [
            expectedHoldings[2].hrid,
            expectedHoldings[3].hrid,
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search holdings by "Holdings — Electronic access — Link text" field using "equals" operator
          QueryModal.selectField(holdingsFieldValues.electronicAccessLinkText);
          QueryModal.verifySelectedField(holdingsFieldValues.electronicAccessLinkText);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Electronic resource (PDF)');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyElectronicAccessInQueryModal(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search holdings by "Holdings — Electronic access — Material specified" field using "contains" operator
          QueryModal.selectField(holdingsFieldValues.electronicAccessMaterialSpecified);
          QueryModal.verifySelectedField(holdingsFieldValues.electronicAccessMaterialSpecified);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('contents');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyElectronicAccessInQueryModal(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search holdings by "Holdings — Electronic access — URL public note" field using "starts with" operator
          QueryModal.selectField(holdingsFieldValues.electronicAccessURLPublicNote);
          QueryModal.verifySelectedField(holdingsFieldValues.electronicAccessURLPublicNote);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('FTP access to PostScript version');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFind.forEach((holding) => {
            verifyElectronicAccessInQueryModal(holding);
          });

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Verify Holdings 3 and Holdings 4 are NOT displayed
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(folioInstance.holdingHrids[2]);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(folioInstance.holdingHrids[3]);
        },
      );
    });
  });
});
