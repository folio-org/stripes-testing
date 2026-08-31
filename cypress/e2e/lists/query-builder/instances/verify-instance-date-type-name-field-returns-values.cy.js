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
const listData = {
  name: `AT_C813028_List_${getRandomPostfix()}`,
  description: `AT_C813028_Desc_${getRandomPostfix()}`,
};
const titlePrefix = 'AT_C813028_Instance';
const testData = {
  instanceTypeId: null,
  dateTypeId: null,
  dateTypeName: null,
  additionalDateTypeId: null,
  additionalDateTypeName: null,
  instanceWithQuestionableDate: {
    title: `${titlePrefix}_Questionable_${getRandomPostfix()}`,
    id: null,
  },
  instanceWithDetailedDate: {
    title: `${titlePrefix}_Detailed_${getRandomPostfix()}`,
    id: null,
  },
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C813028');
        // Get instance type
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        // Get instance date types and find specific ones
        cy.getInstanceDateTypesViaAPI(100)
          .then(({ instanceDateTypes }) => {
            const questionableDate = instanceDateTypes.find(
              (type) => type.name === 'Questionable date',
            );
            const detailedDate = instanceDateTypes.find((type) => type.name === 'Detailed date');

            testData.dateTypeId = questionableDate.id;
            testData.dateTypeName = questionableDate.name;
            testData.additionalDateTypeId = detailedDate.id;
            testData.additionalDateTypeName = detailedDate.name;
          })
          .then(() => {
            // Create first instance with Questionable date type
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceWithQuestionableDate.title,
                dates: {
                  dateTypeId: testData.dateTypeId,
                  date1: '2024',
                },
              },
            }).then((instanceIds) => {
              testData.instanceWithQuestionableDate.id = instanceIds.instanceId;
            });
          })
          .then(() => {
            // Create second instance with Detailed date type
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceWithDetailedDate.title,
                dates: {
                  dateTypeId: testData.additionalDateTypeId,
                  date1: '2025',
                },
              },
            }).then((instanceIds) => {
              testData.instanceWithDetailedDate.id = instanceIds.instanceId;
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
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithQuestionableDate.id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithDetailedDate.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C813028 Verify that the field "Instance date type - Name" return values (athena)',
        { tags: ['extendedPath', 'athena', 'C813028'] },
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

          // Step 2: Add title filter to control test data
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(titlePrefix);
          QueryModal.addNewRow();

          // Step 3: Select "Instance date type — Name" field, use "in" operator, select only Questionable date
          QueryModal.selectField(instanceFieldValues.instanceDateTypeName, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceDateTypeName, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.dateTypeName, 1);
          QueryModal.verifySelectedMultiselectValue([testData.dateTypeName], 1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.clickTestQuery();

          // Step 4: Check preview - verify only instance with Questionable date is returned
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithQuestionableDate.title,
            instanceFieldValues.instanceDateTypeName,
            testData.dateTypeName,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithDetailedDate.title,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 5: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 6: Verify result after refresh is done
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instanceWithQuestionableDate.title);
          });
        },
      );
    });
  });
});
