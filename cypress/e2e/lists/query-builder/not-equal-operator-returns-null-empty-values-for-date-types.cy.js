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
const listName = `AT_C740217_List_${getRandomPostfix()}`;
const titlePrefix = 'AT_C740217_';
const testData = {
  instanceWithDate: {
    title: `${titlePrefix}WithCatalogDate_${getRandomPostfix()}`,
    catalogedDate: '2024-01-15',
  },
  instanceWithoutDate: {
    title: `${titlePrefix}NoCatalogDate_${getRandomPostfix()}`,
  },
  queryDate: '01/01/2020',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C740217_');
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          // Create instance WITH cataloged date
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithDate.title,
              catalogedDate: testData.instanceWithDate.catalogedDate,
            },
          }).then((instanceIds) => {
            testData.instanceWithDate.id = instanceIds.instanceId;
          });
        })
        .then(() => {
          // Create instance WITHOUT cataloged date
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceWithoutDate.title,
            },
          }).then((instanceIds) => {
            testData.instanceWithoutDate.id = instanceIds.instanceId;
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
      InventoryInstance.deleteInstanceViaApi(testData.instanceWithDate.id);
      InventoryInstance.deleteInstanceViaApi(testData.instanceWithoutDate.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C740217 Null/Empty values are returned with the 'not equal to' operator for the date types (corsair)",
      { tags: ['extendedPath', 'corsair', 'C740217'] },
      () => {
        // Step 1: Create new list and open query builder
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query with "not equal to" operator for cataloged date AND title starts with filter
        QueryModal.selectField(instanceFieldValues.catalogedDate);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield(testData.queryDate);
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
        QueryModal.fillInValueTextfield(titlePrefix, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 3: Verify "Instance — Cataloged date" column contains both date values and empty values
        // Verify at least one row with filled cataloged date
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.instanceWithDate.title,
          instanceFieldValues.catalogedDate,
          '2024',
        );

        // Verify at least one row with empty cataloged date (displayed as "-")
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.instanceWithoutDate.title,
          instanceFieldValues.catalogedDate,
          '',
        );
      },
    );
  });
});
