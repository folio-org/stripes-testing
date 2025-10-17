import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
let alternativeTitleTypes;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C825248_FolioInstance_1_${getRandomPostfix()}`,
    alternativeTitles: [
      {
        alternativeTitleType: 'Variant title',
        alternativeTitle: 'Gas in the CIS and Europe',
      },
    ],
  },
  {
    // Instance 2
    title: `AT_C825248_FolioInstance_2_${getRandomPostfix()}`,
    alternativeTitles: [
      {
        alternativeTitleType: 'Variant title',
        alternativeTitle: 'Panel title: Petroleum Economist gas in the CIS and Europe',
      },
      {
        alternativeTitleType: 'Former title',
        alternativeTitle: 'Petroleum Economist energy maps',
      },
      {
        alternativeTitleType: 'Uniform title',
        alternativeTitle: 'Petroleum Economist Cartographic energy maps',
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C825248_FolioInstance_3_${getRandomPostfix()}`,
    alternativeTitles: [
      {
        alternativeTitleType: 'Cover title',
        alternativeTitle: 'Gas in the CIS & Europe',
      },
    ],
  },
  {
    // Instance 4 - no alternative titles
    title: `AT_C825248_FolioInstance_4_${getRandomPostfix()}`,
    alternativeTitles: [],
  },
];

// Helper function to find type ID by name
const findAlternativeTitleTypeId = (name) => {
  return alternativeTitleTypes.find((type) => type.name === name)?.id;
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825248');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get alternative title types
          cy.getAlternativeTitlesTypes().then((types) => {
            alternativeTitleTypes = types;

            // Get required IDs for instances
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Create instances with alternative titles
              testInstancesData.forEach((instanceData, index) => {
                const alternativeTitlesForApi = instanceData.alternativeTitles.map((altTitle) => ({
                  alternativeTitleTypeId: findAlternativeTitleTypeId(altTitle.alternativeTitleType),
                  alternativeTitle: altTitle.alternativeTitle,
                }));

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    alternativeTitles: alternativeTitlesForApi,
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    testInstancesData[index].hrid = instanceResponse.hrid;
                    testInstancesData[index].id = instanceResponse.id;
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

        testInstancesData.forEach((instance) => {
          if (instance.id) {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          }
        });
      });

      // Trillium
      it.skip(
        'C825248 Search instances by Alternative titles fields (firebird)',
        { tags: [] },
        () => {
          // Map alternative titles data to format expected by UI verification
          const mappedInstancesDataToUIView = testInstancesData.map((instance) => ({
            ...instance,
            alternativeTitles: instance.alternativeTitles.map((altTitle) => ({
              alternativeTitle: altTitle.alternativeTitle,
              alternativeTitleType: altTitle.alternativeTitleType,
            })),
          }));

          // Step 1: Verify Alternative titles fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const alternativeTitlesFields = [
            instanceFieldValues.alternativeTitlesAlternativeTitle,
            instanceFieldValues.alternativeTitlesAlternativeTitleType,
          ];

          alternativeTitlesFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(alternativeTitlesFields);

          // Step 2: Search instances by "Instance — Alternative titles — Alternative title type" field using "in" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.alternativeTitlesAlternativeTitleType);
          QueryModal.verifySelectedField(instanceFieldValues.alternativeTitlesAlternativeTitleType);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('Variant title');
          QueryModal.fillInValueMultiselect('Former title');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C825248_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyColumnDisplayed('Instance — Alternative titles');

          // Expected to find: Instances 1, 2 (both have "Variant title" or "Former title")
          const expectedInstancesToFind = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyAlternativeTitlesEmbeddedTableInQueryModal(
              instance.hrid,
              instance.alternativeTitles,
            );
          });

          // Not expected to find: Instances 3, 4
          const notExpectedToFindInstanceHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Alternative titles — Alternative title" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.alternativeTitlesAlternativeTitle);
          QueryModal.verifySelectedField(instanceFieldValues.alternativeTitlesAlternativeTitle);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('gas in the CIS and Europe');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both contain "gas in the CIS and Europe")
          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyAlternativeTitlesEmbeddedTableInQueryModal(
              instance.hrid,
              instance.alternativeTitles,
            );
          });

          // Not expected to find: Instances 3, 4
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Verify that the results table displays all instances
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: All instances
          mappedInstancesDataToUIView.forEach((instance) => {
            if (instance.alternativeTitles && instance.alternativeTitles.length > 0) {
              QueryModal.verifyAlternativeTitlesEmbeddedTableInQueryModal(
                instance.hrid,
                instance.alternativeTitles,
              );
            } else {
              QueryModal.verifyMatchedRecordsByIdentifier(
                instance.hrid,
                'Instance — Alternative titles',
                '',
              );
            }
          });
        },
      );
    });
  });
});
