import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const testCaseId = 'C844251';
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
  description: `AT_${testCaseId}_Desc_${getRandomPostfix()}`,
};
const titlePrefix = `AT_${testCaseId}_FolioInstance`;
const testData = {
  instanceTypeId: null,
  sourceUri: `https://AT_${testCaseId}_${getRandomPostfix()}`,
  instanceWithSourceUri: {
    title: `${titlePrefix}_WithUri_${getRandomPostfix()}`,
    id: null,
  },
  instanceWithoutSourceUri: {
    title: `${titlePrefix}_WithoutUri_${getRandomPostfix()}`,
    id: null,
  },
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`AT_${testCaseId}`);

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;

          // Create first instance with sourceUri
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithSourceUri.title,
              sourceUri: testData.sourceUri,
            },
          }).then((instanceIds) => {
            testData.instanceWithSourceUri.id = instanceIds.instanceId;
          });

          // Create second instance without sourceUri
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithoutSourceUri.title,
            },
          }).then((instanceIds) => {
            testData.instanceWithoutSourceUri.id = instanceIds.instanceId;
          });
        });

        cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithSourceUri.id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithoutSourceUri.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C844251 Verify that it\'s possible to run queries using the field "Instance source URI" (athena)',
        { tags: ['extendedPath', 'athena', 'C844251'] },
        () => {
          // Step 1: Create new list with Instances record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Add title filter and select "Instance source URI" field
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(titlePrefix);
          QueryModal.addNewRow();

          QueryModal.selectField(instanceFieldValues.instanceSourceUri, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceSourceUri, 1);
          QueryModal.verifyOperatorColumn();

          // Step 3: Test "is null/empty" operator with False
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.source_uri is null/empty False)`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.clickTestQuery();

          // Step 4: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyColumnDisplayed(instanceFieldValues.instanceSourceUri);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            testData.sourceUri,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutSourceUri.title,
          );

          // Step 5: Test "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.sourceUri, 1);
          QueryModal.verifyTextFieldValue(testData.sourceUri, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.source_uri == ${testData.sourceUri})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            testData.sourceUri,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutSourceUri.title,
          );

          // Step 6: Test "contains" operator
          const partialValue = testData.sourceUri.slice(0, -3);

          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInValueTextfield(partialValue, 1);
          QueryModal.verifyTextFieldValue(partialValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.source_uri contains ${partialValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            testData.sourceUri,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutSourceUri.title,
          );

          // Step 7: Test "starts with" operator
          const firstChars = testData.sourceUri.substring(0, 8);

          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield(firstChars, 1);
          QueryModal.verifyTextFieldValue(firstChars, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.source_uri starts with ${firstChars})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            testData.sourceUri,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutSourceUri.title,
          );

          // Step 8: Test "not equal to" operator
          const randomValue = 'random-text-value';

          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield(randomValue, 1);
          QueryModal.verifyTextFieldValue(randomValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.source_uri != ${randomValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            testData.sourceUri,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithoutSourceUri.title,
            instanceFieldValues.instanceSourceUri,
            '',
          );

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 9: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 10: Verify result after refresh is done
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 11: Click "View updated list" link and verify
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instanceWithSourceUri.title);

            // Step 12: Edit query
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.testQueryDisabled(false);
            QueryModal.cancelDisabled(false);
            QueryModal.runQueryDisabled();
            QueryModal.xButttonDisabled(false);
            QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle, 0);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 0);
            QueryModal.verifyTextFieldValue(titlePrefix, 0);
            QueryModal.verifySelectedField(instanceFieldValues.instanceSourceUri, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
            QueryModal.verifyTextFieldValue(randomValue, 1);
            QueryModal.verifyQueryAreaContent(
              `(instance.title starts with ${titlePrefix}) AND (instance.source_uri != ${randomValue})`,
            );
            QueryModal.testQueryDisabled(false);

            // Step 13: Re-test query
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.instanceWithSourceUri.title,
              instanceFieldValues.instanceSourceUri,
              testData.sourceUri,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.instanceWithoutSourceUri.title,
              instanceFieldValues.instanceSourceUri,
              '',
            );
            QueryModal.verifyNumberOfMatchedRecords(recordCount);
          });
        },
      );
    });
  });
});
