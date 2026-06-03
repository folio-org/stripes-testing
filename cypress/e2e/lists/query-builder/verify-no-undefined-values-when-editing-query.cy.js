import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const recordType = 'Instances';
const listName = `C1259783_List_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C1259783_FolioInstance_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user, instance and login', () => {
      cy.getAdminToken()
        .then(() => {
          // Get instance type ID
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          // Create FOLIO instance with English language
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
              languages: ['eng'],
            },
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
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
      cy.getUserToken(user.username, user.password);
      Lists.deleteListByNameViaApi(listName, true);
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1259783 Verify that no undefined values are displayed when editing a query (corsair)',
      { tags: ['smoke', 'corsair', 'C1259783'] },
      () => {
        // Step 1: Create new list with Instances record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription('Test list for verifying no undefined values');
        Lists.selectRecordType(recordType);
        Lists.buildQuery();

        // Step 2: Configure query - Instance Languages equals English AND Instance UUID equals test instance
        QueryModal.selectField(instanceFieldValues.languages);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('English');
        QueryModal.verifyQueryAreaContent('(instance.languages == English)');
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceId, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.instanceId, 1);
        QueryModal.verifyQueryAreaContent(
          `(instance.languages == English) AND (instance.id == ${testData.instanceId})`,
        );

        // Step 3: Change operator from "equals" to "IN"
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifySelectedMultiselectValue(['English']);
        QueryModal.verifyQueryAreaContent(
          `(instance.languages in [English]) AND (instance.id == ${testData.instanceId})`,
        );
        QueryModal.verifyQueryAreaDoesNotContain('undefined');

        // Step 4: Test query and save
        QueryModal.testQuery();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 5: Wait for compiling and verify refresh complete
        Lists.verifyRefreshCompleteCallout(1);

        // Step 6: Click "View updated list" - displays record table
        Lists.viewUpdatedList();
        Lists.verifyRecordWithContent(testData.instanceTitle);

        // Step 7: Edit query
        Lists.openActions();
        Lists.editList();
        Lists.editQuery();
        QueryModal.verifySelectedField(instanceFieldValues.languages);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifySelectedMultiselectValue(['English']);
        QueryModal.verifySelectedField(instanceFieldValues.instanceId, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.verifyQueryAreaContent(
          `(instance.languages in [English]) AND (instance.id == ${testData.instanceId})`,
        );
        QueryModal.verifyQueryAreaDoesNotContain('undefined');
        QueryModal.testQueryDisabled(false);
      },
    );
  });
});
