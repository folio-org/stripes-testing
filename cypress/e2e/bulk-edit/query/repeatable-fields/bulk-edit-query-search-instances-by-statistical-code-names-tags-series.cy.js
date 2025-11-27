import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let instanceTypeId;
let statisticalCodes;
let fileNames;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C805789_Instance_1_${getRandomPostfix()}`,
    statisticalCodeIds: [],
    tags: { tagList: ['important'] },
    series: [{ value: 'Central Institute of Indian Languages. CIIL linguistic atlas series; 1.' }],
  },
  {
    // Instance 2 - multiple statistical codes, tags, and series
    title: `AT_C805789_Instance_2_${getRandomPostfix()}`,
    statisticalCodeIds: [],
    tags: { tagList: ['important', 'test', 'urgent'] },
    series: [
      { value: 'John Bartholomew and Son. Bartholomew world travel series; 10.' },
      { value: 'United States. Army Map Service. Special Africa series, no. 12.' },
      { value: 'Series statement.' },
    ],
  },
  {
    // Instance 3
    title: `AT_C805789_Instance_3_${getRandomPostfix()}`,
    statisticalCodeIds: [],
    tags: { tagList: ['test'] },
    series: [{ value: 'Series statement.' }],
  },
  {
    // Instance 4 - no statistical codes, tags, or series
    title: `AT_C805789_Instance_4_${getRandomPostfix()}`,
    statisticalCodeIds: [],
    tags: { tagList: [] },
    series: [],
  },
];

// Helper function to populate string properties for UI display
const populateInstanceStringProperties = (instanceData, statCodes) => {
  instanceData.expectedTagsString = instanceData.tags.tagList.join(' | ');
  instanceData.expectedSeriesString = instanceData.series.map((s) => s.value).join(' | ');

  if (instanceData.statisticalCodeIds.length === 0) {
    instanceData.expectedStatisticalCodeName = '';
    return;
  }

  if (instanceData.statisticalCodeIds.length === 1) {
    const code = statCodes.find((c) => c.id === instanceData.statisticalCodeIds[0]);
    instanceData.expectedStatisticalCodeName = code.fullName;
  } else {
    const codeNames = instanceData.statisticalCodeIds.map(
      (id) => statCodes.find((c) => c.id === id).fullName,
    );
    instanceData.expectedStatisticalCodeName = codeNames.join(' | ');
  }
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805789');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });

          cy.getStatisticalCodes({ limit: 4 }).then((codes) => {
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              // Build full names for statistical codes
              statisticalCodes = codes.map((code) => {
                const codeType = codeTypes.find((type) => type.id === code.statisticalCodeTypeId);
                return {
                  ...code,
                  typeName: codeType.name,
                  fullName: `${codeType.name}: ${code.code} - ${code.name}`,
                };
              });

              // Statistical code assignments for each instance
              const instanceStatisticalCodeConfig = [
                { instanceIndex: 0, codeIndexes: [0] },
                { instanceIndex: 1, codeIndexes: [0, 1, 2] },
                { instanceIndex: 2, codeIndexes: [1] },
                { instanceIndex: 3, codeIndexes: [] },
              ];

              // Assign statistical codes to instances based on configuration
              instanceStatisticalCodeConfig.forEach((config) => {
                testInstancesData[config.instanceIndex].statisticalCodeIds = config.codeIndexes.map(
                  (index) => statisticalCodes[index].id,
                );
                populateInstanceStringProperties(
                  testInstancesData[config.instanceIndex],
                  statisticalCodes,
                );
              });

              // Create instances with statistical codes, tags, and series
              testInstancesData.forEach((instanceData, index) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    statisticalCodeIds: instanceData.statisticalCodeIds,
                    tags: instanceData.tags,
                    series: instanceData.series,
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    testInstancesData[index].hrid = instanceResponse.hrid;
                    testInstancesData[index].id = instanceResponse.id;
                  });
                });
              });

              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        testInstancesData.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        if (fileNames) {
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        }
      });

      it(
        'C805789 Search instances by Statistical code names, Tags, Series (firebird)',
        { tags: ['criticalPath', 'firebird', 'C805789'] },
        () => {
          // Step 1: Search instances by "Instance — Statistical codes" field using "equals" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.statisticalCodeNames);
          QueryModal.verifySelectedField(instanceFieldValues.statisticalCodeNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(statisticalCodes[0].fullName);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C805789_Instance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            `(instance.statistical_code_names == ${statisticalCodes[0].fullName}) AND (instance.title starts with AT_C805789_Instance)`,
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instance 1 and Instance 2 (both have the first statistical code)
          const expectedInstancesToFind = [testInstancesData[0], testInstancesData[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.statisticalCodeNames,
              instance.expectedStatisticalCodeName,
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

          // Step 2: Search instances by "Instance — Tags" field using "in" operator
          QueryModal.selectField(instanceFieldValues.tags);
          QueryModal.verifySelectedField(instanceFieldValues.tags);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('important');
          QueryModal.fillInValueMultiselect('urgent');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.tags in [important, urgent]) AND (instance.title starts with AT_C805789_Instance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          // Expected to find: Instance 1 and Instance 2 (both have important or urgent tags)
          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.tags,
              instance.expectedTagsString,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Series" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.series);
          QueryModal.verifySelectedField(instanceFieldValues.series);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('series; 1');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.series contains series; 1) AND (instance.title starts with AT_C805789_Instance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.hrid,
              instanceFieldValues.series,
              instance.expectedSeriesString,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Click "Run query" button and check "Statistical code" column in Preview of records matched
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview').then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];

            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            );

            // Verify the statistical code column format
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              testInstancesData[0].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              testInstancesData[0].expectedStatisticalCodeName,
            );

            // Step 6: Download matched records (CSV) and check populating "Statistical code" column in the file
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            // Verify the format of rendered statistical codes in CSV file matches Preview
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              testInstancesData[0].hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              testInstancesData[0].expectedStatisticalCodeName,
            );
          });
        },
      );
    });
  });
});
