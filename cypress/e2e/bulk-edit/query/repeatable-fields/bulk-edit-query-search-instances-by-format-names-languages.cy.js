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
import Formats from '../../../../support/fragments/settings/inventory/instances/formats';

let user;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C825245_Instance_1_${getRandomPostfix()}`,
    instanceFormatIds: [],
    formatNames: ['computer -- online resource'],
    languages: ['por'],
    expectedFormatNames: ['computer -- online resource'],
    expectedLanguages: ['Portuguese'],
  },
  {
    // Instance 2 - multiple formats and languages
    title: `AT_C825245_Instance_2_${getRandomPostfix()}`,
    instanceFormatIds: [],
    formatNames: ['video -- videodisc', 'computer -- online resource', 'audio -- audio disc'],
    languages: ['cze', 'por', 'fre'],
    expectedFormatNames: [
      'video -- videodisc',
      'computer -- online resource',
      'audio -- audio disc',
    ],
    expectedLanguages: ['Czech', 'Portuguese', 'French'],
  },
  {
    // Instance 3
    title: `AT_C825245_Instance_3_${getRandomPostfix()}`,
    instanceFormatIds: [],
    formatNames: ['unmediated -- sheet'],
    languages: ['ger'],
    expectedFormatNames: ['unmediated -- sheet'],
    expectedLanguages: ['German'],
  },
  {
    // Instance 4 - no formats and languages
    title: `AT_C825245_Instance_4_${getRandomPostfix()}`,
    instanceFormatIds: [],
    formatNames: [],
    languages: [],
    expectedFormatNames: [],
    expectedLanguages: [],
  },
];

// Helper function to verify format names
const verifyFormatNames = (instance, expectedFormatNames) => {
  const formatNamesText = expectedFormatNames.join(' | ');
  QueryModal.verifyMatchedRecordsByIdentifier(
    instance.hrid,
    'Instance — Format names',
    formatNamesText,
  );
};

// Helper function to verify languages
const verifyLanguages = (instance, expectedLanguages) => {
  const languagesText = expectedLanguages.join(' | ');
  QueryModal.verifyMatchedRecordsByIdentifier(instance.hrid, 'Instance — Languages', languagesText);
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825245');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get instance formats to map names to IDs
          Formats.getViaApi({ limit: 100 }).then((formats) => {
            const formatMap = {};
            formats.forEach((format) => {
              formatMap[format.name] = format.id;
            });

            // Map format names to IDs for each instance
            testInstancesData.forEach((instanceData) => {
              instanceData.instanceFormatIds = instanceData.formatNames.map(
                (formatName) => formatMap[formatName],
              );
            });

            // Get required IDs for instances
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Create instances with format names and languages
              testInstancesData.forEach((instanceData, index) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    instanceFormatIds: instanceData.instanceFormatIds,
                    languages: instanceData.languages,
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    // Add hrid to the original testInstancesData
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
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C825245 Search instances by Format names, Languages (firebird)',
        { tags: ['criticalPath', 'firebird', 'C825245'] },
        () => {
          // Step 1: Search instances by "Instance — Format names" field using "equals" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(instanceFieldValues.formatNames);
          QueryModal.verifySelectedField(instanceFieldValues.formatNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('computer -- online resource');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C825245_Instance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instance 1 and Instance 2 (both have "computer -- online resource" format)
          const expectedInstancesToFind = [testInstancesData[0], testInstancesData[1]];

          expectedInstancesToFind.forEach((instance) => {
            verifyFormatNames(instance, instance.expectedFormatNames);
          });

          // Not expected to find: Instance 3 and Instance 4
          const notExpectedToFindInstanceHrids = [
            testInstancesData[2].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 2: Search instances by "Instance — Languages" field using "in" operator
          QueryModal.selectField(instanceFieldValues.languages);
          QueryModal.verifySelectedField(instanceFieldValues.languages);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('Czech');
          QueryModal.fillInValueMultiselect('Portuguese');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instance 1 and Instance 2 (both have Czech or Portuguese languages)
          expectedInstancesToFind.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguages);
          });

          // Not expected to find: Instance 3 and Instance 4
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Check display of Instance data in "Instance — Format names", "Instance — Languages" columns
          // Verify that multiple entries are separated by "|" in Instance 2
          verifyFormatNames(testInstancesData[1], testInstancesData[1].expectedFormatNames);
          verifyLanguages(testInstancesData[1], testInstancesData[1].expectedLanguages);
        },
      );
    });
  });
});
