import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';

let user;
let instanceTypeId;
const relationshipIds = {};
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C808446_Instance_1_${getRandomPostfix()}`,
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
        uri: 'http://hdl.loc.gov/loc.music/sm1872.00758',
        linkText: 'Available onsite via Stacks',
        materialsSpecification: 'Online eBook on Scientific.net',
        publicNote: '(Nature Publishing Group Journals)',
      },
    ],
  },
  {
    // Instance 2 - multiple electronic access entries
    title: `AT_C808446_Instance_2_${getRandomPostfix()}`,
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
        uri: 'http://hdl.loc.gov/loc.music/sm1872.00756',
        linkText: 'Available onsite',
        materialsSpecification: '',
        publicNote: '',
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
        uri: 'http://hdl.loc.gov/loc.music/sm1872.00757',
        linkText: '',
        materialsSpecification: 'Book description',
        publicNote:
          'Full text from Nature Journals Online: 01/09/2002 to present (Requires EZproxy login off-campus)',
      },
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        uri: 'http://hdl.loc.gov/loc.music/sm1872.00758',
        linkText: '',
        materialsSpecification: 'Online eBook on Scientific.net',
        publicNote: '(Nature Publishing Group Journals)',
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C808446_Instance_3_${getRandomPostfix()}`,
    electronicAccess: [
      {
        relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        uri: 'http://hdl.loc.gov/loc.music/sm1872.00759',
        linkText: 'Link text',
        materialsSpecification: 'Materials specified',
        publicNote: 'URL public note',
      },
    ],
  },
  {
    // Instance 4 - no electronic access
    title: `AT_C808446_Instance_4_${getRandomPostfix()}`,
    electronicAccess: [],
    expectedElectronicAccess: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808446');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });

          [
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          ].forEach((name) => {
            UrlRelationship.getViaApi({
              query: `name=="${name}"`,
            }).then((data) => {
              relationshipIds[name] = data[0].id;
            });
          });

          // Create instances with electronic access data
          cy.wrap(null).then(() => {
            // Define relationship mapping for each instance
            const instanceRelationshipMapping = [
              [ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED],
              [
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
              ],
              [ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE],
              [],
            ];

            testInstancesData.forEach((instanceData, index) => {
              // Map relationship names to IDs for electronic access entries
              const electronicAccessWithIds = instanceData.electronicAccess.map(
                (access, accessIndex) => {
                  const relationshipName = instanceRelationshipMapping[index][accessIndex];
                  const relationshipId = relationshipIds[relationshipName];

                  return {
                    ...access,
                    relationshipId,
                  };
                },
              );

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceData.title,
                  electronicAccess: electronicAccessWithIds,
                },
              }).then((createdInstance) => {
                cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                  testInstancesData[index].hrid = instanceResponse.hrid;
                  testInstancesData[index].id = instanceResponse.id;
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

        testInstancesData.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C808446 Search instances by Electronic access fields (firebird)',
        { tags: ['smoke', 'firebird', 'C808446'] },
        () => {
          // Step 1: Verify Electronic access fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const electronicAccessFields = [
            instanceFieldValues.electronicAccessLinkText,
            instanceFieldValues.electronicAccessMaterialSpecified,
            instanceFieldValues.electronicAccessURI,
            instanceFieldValues.electronicAccessURLPublicNote,
            instanceFieldValues.electronicAccessURLRelationship,
          ];

          electronicAccessFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
          QueryModal.verifySubsetOfFieldsSortedAlphabetically(electronicAccessFields);
          QueryModal.clickSelectFieldButton();

          // Step 2: Search instances by "Instance — Electronic access — URL relationship" field using "in" operator
          QueryModal.selectField(instanceFieldValues.electronicAccessURLRelationship);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessURLRelationship);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
          );
          QueryModal.fillInValueMultiselect(ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808446_Instance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instance 1 and Instance 2
          const expectedInstancesToFind = [testInstancesData[0], testInstancesData[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
              instance.hrid,
              instance.electronicAccess,
            );
          });

          // Not expected to find: Instance 3 and Instance 4
          const notExpectedToFindInstanceHrids = [
            testInstancesData[2].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Electronic access — URI" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.electronicAccessURI);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessURI);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('http://hdl.loc.gov/loc.music/sm1872.00758');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
              instance.hrid,
              instance.electronicAccess,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search instances by "Instance — Electronic access — Link text" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.electronicAccessLinkText);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessLinkText);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('Available onsite');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
              instance.hrid,
              instance.electronicAccess,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search instances by "Instance — Electronic access — Material specified" field using "starts with" operator
          QueryModal.selectField(instanceFieldValues.electronicAccessMaterialSpecified);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessMaterialSpecified);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Online eBook');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
              instance.hrid,
              instance.electronicAccess,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search instances by "Instance — Electronic access — URL public note" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.electronicAccessURLPublicNote);
          QueryModal.verifySelectedField(instanceFieldValues.electronicAccessURLPublicNote);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('(Nature Publishing Group Journals)');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyElectronicAccessEmbeddedTableInQueryModal(
              instance.hrid,
              instance.electronicAccess,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Check display of Instance data from Preconditions in "Instance — Electronic access" column in the result table
          // Verify that instances without electronic access have empty column
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            testInstancesData[3].hrid,
            'Instance — Electronic access',
            '',
          );
        },
      );
    });
  });
});
