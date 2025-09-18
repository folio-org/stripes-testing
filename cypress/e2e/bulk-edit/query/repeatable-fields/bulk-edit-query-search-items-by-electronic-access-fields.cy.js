import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import {
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let materialTypeId;
let loanTypeId;
const electronicAccessTypeIds = [];
const folioInstance = {
  title: `AT_C813676_FolioInstance_${getRandomPostfix()}`,
};
const items = [];

const getItemsElectronicAccessData = (
  noDisplayConstantId,
  versionOfResourceId,
  noInformationProvidedId,
  resourceId,
) => [
  {
    // Item 1
    electronicAccess: [
      {
        uri: 'http://www.mapnetwork.org/',
        linkText: 'Monitoring the AIDS Pandemic (Network)',
        materialsSpecification: 'Book',
        publicNote:
          'Available from: http://www.mapnetwork.org/reports/aidsinasia.html; http://www.who.int/hiv/pub/epidemiology/aidsinasia/en/; http://www.fhi.org/en/HIVAIDS/Publications/survreports/aidsinasia.htm',
        relationshipId: noDisplayConstantId,
      },
    ],
  },
  {
    // Item 2 - multiple electronic access entries
    electronicAccess: [
      {
        uri: 'http://www.mapnetwork.org/reports/aidsinasia.html',
        linkText: 'Monitoring the Aids Pandemic, [Washington, D.C.]',
        materialsSpecification: 'Digital (Online)',
        publicNote: '',
        relationshipId: versionOfResourceId,
      },
      {
        uri: 'http://catalog.hathitrust.org/Record/009596148',
        linkText: 'Electronic copy from HathiTrust',
        materialsSpecification: 'Book',
        publicNote: 'Also available in digital form',
        relationshipId: noDisplayConstantId,
      },
      {
        uri: 'http://purl.nysed.gov/nysl/1290403048',
        linkText: 'COVID-19 Pandemic--(2020-)',
        materialsSpecification: 'Book',
        publicNote: 'Prepared by the Office of Budget and Policy Analysis',
        relationshipId: noInformationProvidedId,
      },
    ],
  },
  {
    // Item 3
    electronicAccess: [
      {
        uri: 'https://www.unicef.org/india/media/6761/file/Assessing%20impact%20of%20the%20COVID-19%20pandemic%20.pdf',
        linkText: 'Includes statistical tables',
        materialsSpecification:
          '1 online resource (xxix, 65 pages) : color illustrations, 1 color map',
        publicNote: 'Study conducted in 12 districts of seven states',
        relationshipId: resourceId,
      },
    ],
  },
  {
    // Item 4 - no electronic access
    electronicAccess: [],
  },
];

// Helper function to verify electronic access data in the query modal
const verifyElectronicAccessInQueryModal = (item) => {
  QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(item.barcode, item.electronicAccess);
};

// Function to create expected items array with transformed electronic access data
const createExpectedItems = (itemBarcodes) => [
  {
    barcode: itemBarcodes[0],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
        uri: 'http://www.mapnetwork.org/',
        linkText: 'Monitoring the AIDS Pandemic (Network)',
        materialsSpecified: 'Book',
        publicNote:
          'Available from: http://www.mapnetwork.org/reports/aidsinasia.html; http://www.who.int/hiv/pub/epidemiology/aidsinasia/en/; http://www.fhi.org/en/HIVAIDS/Publications/survreports/aidsinasia.htm',
      },
    ],
  },
  {
    barcode: itemBarcodes[1],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
        uri: 'http://www.mapnetwork.org/reports/aidsinasia.html',
        linkText: 'Monitoring the Aids Pandemic, [Washington, D.C.]',
        materialsSpecified: 'Digital (Online)',
        publicNote: '',
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
        uri: 'http://catalog.hathitrust.org/Record/009596148',
        linkText: 'Electronic copy from HathiTrust',
        materialsSpecified: 'Book',
        publicNote: 'Also available in digital form',
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
        uri: 'http://purl.nysed.gov/nysl/1290403048',
        linkText: 'COVID-19 Pandemic--(2020-)',
        materialsSpecified: 'Book',
        publicNote: 'Prepared by the Office of Budget and Policy Analysis',
      },
    ],
  },
  {
    barcode: itemBarcodes[2],
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        uri: 'https://www.unicef.org/india/media/6761/file/Assessing%20impact%20of%20the%20COVID-19%20pandemic%20.pdf',
        linkText: 'Includes statistical tables',
        materialsSpecified: '1 online resource (xxix, 65 pages) : color illustrations, 1 color map',
        publicNote: 'Study conducted in 12 districts of seven states',
      },
    ],
  },
  {
    barcode: itemBarcodes[3],
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813676');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypeData) => {
            holdingTypeId = holdingTypeData[0].id;
          });
          cy.getDefaultMaterialType().then((materialType) => {
            materialTypeId = materialType.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getLocations({ limit: 1 })
            .then((location) => {
              locationId = location.id;
            })
            .then(() => {
              [
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
              ].forEach((name) => {
                UrlRelationship.getViaApi({
                  query: `name=="${name}"`,
                }).then((data) => {
                  electronicAccessTypeIds.push(data[0].id);
                });
              });
            })
            .then(() => {
              const itemsElectronicAccessData = getItemsElectronicAccessData(
                ...electronicAccessTypeIds,
              );

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                  },
                ],
                items: itemsElectronicAccessData.map((itemData, index) => ({
                  barcode: `AT_C813676_Item_${index + 1}_${getRandomPostfix()}`,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  electronicAccess: itemData.electronicAccess,
                })),
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;

                createdInstanceData.items.forEach((item) => {
                  items.push({
                    id: item.id,
                    barcode: item.barcode,
                    hrid: item.hrid,
                    holdingId: createdInstanceData.holdings[0].id,
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

      // Trillium
      it.skip('C813676 Search items by Electronic access fields (firebird)', { tags: [] }, () => {
        // Create expected items for verification
        const itemBarcodes = items.map((item) => item.barcode);
        const expectedItems = createExpectedItems(itemBarcodes);

        // Step 1: Verify Electronic access fields are queryable under "Select options" dropdown
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        [
          itemFieldValues.electronicAccessLinkText,
          itemFieldValues.electronicAccessMaterialSpecified,
          itemFieldValues.electronicAccessURI,
          itemFieldValues.electronicAccessURLPublicNote,
          itemFieldValues.electronicAccessURLRelationship,
        ].forEach((field) => {
          QueryModal.selectField(field);
          QueryModal.verifySelectedField(field);
        });
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();

        // Step 2: Search items by "Items — Electronic access — URL relationship" field using "equals" operator
        QueryModal.selectField(itemFieldValues.electronicAccessURLRelationship);
        QueryModal.verifySelectedField(itemFieldValues.electronicAccessURLRelationship);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('No display constant generated');
        QueryModal.addNewRow();
        QueryModal.selectField(itemFieldValues.itemBarcode, 1);
        QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
        QueryModal.fillInValueTextfield('AT_C813676_Item', 1);
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickShowColumnsButton();
        QueryModal.clickCheckboxInShowColumns('Item — Electronic access');
        QueryModal.clickShowColumnsButton();

        let expectedItemsToFind = [expectedItems[0], expectedItems[1]];

        expectedItemsToFind.forEach((item) => {
          verifyElectronicAccessInQueryModal(item);
        });

        let notExpectedToFindItemBarcodes = [expectedItems[2].barcode, expectedItems[3].barcode];

        notExpectedToFindItemBarcodes.forEach((barcode) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
        });

        // Step 3: Search items by "Items — Electronic access — URI" field using "starts with" operator
        QueryModal.selectField(itemFieldValues.electronicAccessURI);
        QueryModal.verifySelectedField(itemFieldValues.electronicAccessURI);
        QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
        QueryModal.fillInValueTextfield('http://www.mapnetwork.org');
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        expectedItemsToFind = [expectedItems[0], expectedItems[1]];

        expectedItemsToFind.forEach((item) => {
          verifyElectronicAccessInQueryModal(item);
        });

        notExpectedToFindItemBarcodes = [expectedItems[2].barcode, expectedItems[3].barcode];

        notExpectedToFindItemBarcodes.forEach((barcode) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
        });

        // Step 4: Search items by "Items — Electronic access — Link text" field using "starts with" operator
        QueryModal.selectField(itemFieldValues.electronicAccessLinkText);
        QueryModal.verifySelectedField(itemFieldValues.electronicAccessLinkText);
        QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
        QueryModal.fillInValueTextfield('Monitoring the AIDS Pandemic');
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        expectedItemsToFind = [expectedItems[0], expectedItems[1]];

        expectedItemsToFind.forEach((item) => {
          verifyElectronicAccessInQueryModal(item);
        });

        notExpectedToFindItemBarcodes = [expectedItems[2].barcode, expectedItems[3].barcode];

        notExpectedToFindItemBarcodes.forEach((barcode) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
        });

        // Step 5: Search items by "Items — Electronic access — Material specified" field using "equals" operator
        QueryModal.selectField(itemFieldValues.electronicAccessMaterialSpecified);
        QueryModal.verifySelectedField(itemFieldValues.electronicAccessMaterialSpecified);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield('Book');
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        expectedItemsToFind = [expectedItems[0], expectedItems[1]];

        expectedItemsToFind.forEach((item) => {
          verifyElectronicAccessInQueryModal(item);
        });

        notExpectedToFindItemBarcodes = [expectedItems[2].barcode, expectedItems[3].barcode];

        notExpectedToFindItemBarcodes.forEach((barcode) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
        });

        // Step 6-7: Search items by "Items — Electronic access — URL public note" field using "contains" operator
        QueryModal.selectField(itemFieldValues.electronicAccessURLPublicNote);
        QueryModal.verifySelectedField(itemFieldValues.electronicAccessURLPublicNote);
        QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
        QueryModal.fillInValueTextfield('available');
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        expectedItemsToFind = [expectedItems[0], expectedItems[1]];

        expectedItemsToFind.forEach((item) => {
          verifyElectronicAccessInQueryModal(item);
        });

        notExpectedToFindItemBarcodes = [expectedItems[2].barcode, expectedItems[3].barcode];

        notExpectedToFindItemBarcodes.forEach((barcode) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(barcode);
        });
      });
    });
  });
});
