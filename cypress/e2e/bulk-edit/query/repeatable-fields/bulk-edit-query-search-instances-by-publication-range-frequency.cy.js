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
const expectedInstances = [
  {
    // Instance 1
    title: `AT_C825251_Instance_1_${getRandomPostfix()}`,
    publicationRange: ['Began with no. 1 in 1963; ceased with no. 11 in 1966.'],
    publicationFrequency: ['Bimonthly'],
  },
  {
    // Instance 2
    title: `AT_C825251_Instance_2_${getRandomPostfix()}`,
    publicationRange: ['1. Jahrg.- 1974-', 'Began with 1973; ceased with 1983.', '1978/79-'],
    publicationFrequency: ['Irregular', 'Bimonthly', 'Four no. a year'],
  },
  {
    // Instance 3
    title: `AT_C825251_Instance_3_${getRandomPostfix()}`,
    publicationRange: ['[1]  (Tulākhom 2550 [Oct. 2007])-'],
    publicationFrequency: ['Monthly'],
  },
  {
    // Instance 4
    title: `AT_C825251_Instance_4_${getRandomPostfix()}`,
    publicationRange: [],
    publicationFrequency: [],
  },
];

// Helper function to populate string properties for UI display
const populateInstanceStringProperties = (instanceData) => {
  instanceData.publicationRangeString = instanceData.publicationRange.join(' | ');
  instanceData.publicationFrequencyString = instanceData.publicationFrequency.join(' | ');
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825251');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Populate string properties for all instances
          expectedInstances.forEach((instance) => {
            populateInstanceStringProperties(instance);
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              // Create instances with publication data
              expectedInstances.forEach((instanceData) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: instanceData.title,
                    publicationRange: instanceData.publicationRange,
                    publicationFrequency: instanceData.publicationFrequency,
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    instanceData.hrid = instanceResponse.hrid;
                    instanceData.id = instanceResponse.id;
                  });
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        expectedInstances.forEach((instance) => {
          if (instance.id) {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          }
        });
      });

      it(
        'C825251 Search instances by Publication range, Publication frequency (firebird)',
        { tags: ['extendedPath', 'firebird', 'C825251'] },
        () => {
          // Step 1: Search instances by "Instance — Publication range" field using "starts with" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.publicationRange);
          QueryModal.verifySelectedField(instanceFieldValues.publicationRange);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Began with');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C825251_Instance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication_range starts with Began with) AND (instance.title starts with AT_C825251_Instance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both have publication ranges starting with "Began with")
          const expectedInstancesToFind = [expectedInstances[0], expectedInstances[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.publicationRange,
              instance.publicationRangeString,
            );
          });

          // Not expected to find: Instances 3, 4
          const notExpectedToFindInstanceHrids = [
            expectedInstances[2].hrid,
            expectedInstances[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 2: Search instances by "Instance — Publication frequency" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.publicationFrequency);
          QueryModal.verifySelectedField(instanceFieldValues.publicationFrequency);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Bimonthly');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication_frequency == Bimonthly) AND (instance.title starts with AT_C825251_Instance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instances 1, 2 (both have "Bimonthly" frequency)
          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.publicationFrequency,
              instance.publicationFrequencyString,
            );
          });

          // Not expected to find: Instances 3, 4
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
