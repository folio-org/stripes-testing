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
const testCaseId = 'C1045967';
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
  description: `AT_${testCaseId}_Desc_${getRandomPostfix()}`,
};
const titlePrefix = `AT_${testCaseId}_FolioInstance`;
const testData = {
  instanceTypeId: null,
  languageCode: 'ger',
  languageLabel: 'German',
  instanceWithLanguage: {
    title: `${titlePrefix}_WithLanguage_${getRandomPostfix()}`,
    id: null,
  },
  instanceWithoutLanguage: {
    title: `${titlePrefix}_WithoutLanguage_${getRandomPostfix()}`,
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

          // Create first instance with German language
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithLanguage.title,
              languages: [testData.languageCode],
            },
          }).then((instanceIds) => {
            testData.instanceWithLanguage.id = instanceIds.instanceId;
          });

          // Create second instance without language
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithoutLanguage.title,
            },
          }).then((instanceIds) => {
            testData.instanceWithoutLanguage.id = instanceIds.instanceId;
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
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithLanguage.id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithoutLanguage.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        "C1045967 Verify that dynamically fetched values doesn't lose their labels when switching to $in (athena)",
        { tags: ['criticalPath', 'athena', 'C1045967'] },
        () => {
          // Step 1: Create new list with Instances record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(titlePrefix);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.languages, 1);
          QueryModal.verifySelectedField(instanceFieldValues.languages, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(testData.languageLabel, 1);
          QueryModal.verifySelectedValue(testData.languageLabel, 1);

          // Step 2: Click "Test query"
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceWithLanguage.title,
            instanceFieldValues.languages,
            testData.languageLabel,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutLanguage.title,
          );

          // Step 3: Switch operator to "IN" and verify language label persists
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedMultiselectValue([testData.languageLabel], 1);
        },
      );
    });
  });
});
