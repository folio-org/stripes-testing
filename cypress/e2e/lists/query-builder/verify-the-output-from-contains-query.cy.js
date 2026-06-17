import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C446042_List_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `Elpannan och dess ekonomiska förutsättningar \\/ av Hakon Wærn_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1 })
        .then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
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
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C446042 The output from the “contains” query contains at least all of the results from the “==” query (corsair)',
      { tags: ['extendedPath', 'corsair', 'C446042'] },
      () => {
        // Step 1: Create new list
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();

        // Step 2: Click on "Build query" button
        Lists.buildQuery();
        QueryModal.verify();

        // Step 3: Click on "Select field" dropdown, select the option "Instance — Resource title"
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
        QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle);
        QueryModal.verifyQueryAreaContent('(instance.title  )');

        // Step 4: Click on "Select operator" dropdown
        const expectedOperators = Object.values(STRING_OPERATORS);

        QueryModal.verifyOperatorsList(expectedOperators);

        // Step 5: Select "contains" option
        QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
        QueryModal.verifyQueryAreaContent('(instance.title contains )');

        // Step 6: Click on input field in the "Value" column and type Instance resource title value
        QueryModal.fillInValueTextfield(testData.instanceTitle);
        QueryModal.verifyQueryAreaContent(`(instance.title contains ${testData.instanceTitle})`);
        QueryModal.runQueryDisabled();

        // Step 7: Click on "Test query" button
        QueryModal.testQuery();
        QueryModal.runQueryDisabled();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);

        // Step 8: Check the preview of found records
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.runQueryDisabled(false);

        // Step 9: Click on "Run query & save"
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();
        Lists.waitForCompilingAnimationToDisappear();

        // Step 10: Verify the result after the refresh is done
        Lists.verifyRefreshCompleteCallout(1);

        // Step 11: Click on "View updated list" link on the toast message
        Lists.viewUpdatedList();
        Lists.verifyQuery(`instance.title contains ${testData.instanceTitle}`);
        QueryModal.verifyColumnValueForRow(
          testData.instanceTitle,
          instanceFieldValues.instanceResourceTitle,
          testData.instanceTitle,
        );
      },
    );
  });
});
