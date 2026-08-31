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

const listName = `AT_C740199_List_${getRandomPostfix()}`;
const titlePrefix = 'AT_C740199_';
const testData = {
  instanceWithDateType: {
    title: `${titlePrefix}WithDateType_${getRandomPostfix()}`,
  },
  instanceWithoutDateType: {
    title: `${titlePrefix}NoDateType_${getRandomPostfix()}`,
  },
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C740199_');

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
        testData.instanceTypeName = instanceTypes[0].name;
      });
      cy.getInstanceDateTypesViaAPI(2)
        .then(({ instanceDateTypes }) => {
          // Use first date type for testing
          testData.dateTypeId = instanceDateTypes[0].id;
          testData.dateTypeName = instanceDateTypes[0].name;
          testData.dateTypeNameNotFound = instanceDateTypes[1].name;
        })
        .then(() => {
          // Create instance WITH date type
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithDateType.title,
              dates: {
                dateTypeId: testData.dateTypeId,
                date1: '2024',
              },
            },
          }).then((instanceIds) => {
            testData.instanceWithDateType.id = instanceIds.instanceId;
          });
        })
        .then(() => {
          // Create instance WITHOUT date type
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithoutDateType.title,
              // NO dates field - this instance has no date type
            },
          }).then((instanceIds) => {
            testData.instanceWithoutDateType.id = instanceIds.instanceId;
          });
        });

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceWithDateType.id);
      InventoryInstance.deleteInstanceViaApi(testData.instanceWithoutDateType.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C740199 Empty values are returned with the 'not in' operator for the String types (athena)",
      { tags: ['criticalPath', 'athena', 'C740199'] },
      () => {
        // Step 1: Create new list and open query builder
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query with "not in" operator for Instance date type AND title starts with filter
        QueryModal.selectField(instanceFieldValues.instanceDateTypeName);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.chooseFromValueMultiselect(testData.dateTypeNameNotFound);
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
        QueryModal.fillInValueTextfield(titlePrefix, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 3: Verify "Instance date type — Name" column has not only string values, but also some empty values
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.instanceWithoutDateType.title,
          instanceFieldValues.instanceDateTypeName,
          '',
        );
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.instanceWithDateType.title,
          instanceFieldValues.instanceDateTypeName,
          testData.dateTypeName,
        );
      },
    );
  });
});
