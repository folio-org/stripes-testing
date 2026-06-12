import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { instanceCsvHeaders } from '../../../support/fragments/lists/lists-file';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451503_List_${getRandomPostfix()}`;
const listDescription = `AT_C451503_Description_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C451503_FolioInstance_${getRandomPostfix()}`,
  contributorName: `Contributor_${getRandomPostfix()}`,
  instanceStatusCodeId: uuid(),
  statisticalCodes: [],
  contributors: [],
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
        testData.statisticalCode = codes[0];
        testData.statisticalCodes = [testData.statisticalCode.id];
        testData.statisticalCodeUuids = testData.statisticalCode.id;

        cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
          const codeType = codeTypes.find(
            (item) => item.id === testData.statisticalCode.statisticalCodeTypeId,
          );
          testData.statisticalCode.fullName = `${codeType.name}: ${testData.statisticalCode.code} - ${testData.statisticalCode.name}`;
        });
      });
      BrowseContributors.getContributorTypes({ limit: 1 }).then((types) => {
        testData.contributorTypeId = types[0].id;
        testData.contributorTypeName = types[0].name;
      });
      BrowseContributors.getContributorNameTypes({ limit: 1 }).then((nameTypes) => {
        testData.contributorNameTypeId = nameTypes[0].id;
        testData.contributorNameTypeName = nameTypes[0].name;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
            statisticalCodeIds: testData.statisticalCodes,
            contributors: [
              {
                name: testData.contributorName,
                contributorNameTypeId: testData.contributorNameTypeId,
                contributorTypeId: testData.contributorTypeId,
                primary: true,
              },
            ],
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
      Lists.deleteDownloadedFile(listName);
    });

    it(
      'C451503 [Instance] Verify that Non-Queryable array type fields are part of exported .csv files and column selection (corsair)',
      { tags: ['extendedPath', 'corsair', 'C451503'] },
      () => {
        // Define columns to verify
        const arrayTypeColumns = [
          instanceFieldValues.statisticalCodeUuids,
          instanceFieldValues.statisticalCodeNames,
          instanceFieldValues.contributors,
        ];

        // Step 1: Create new list with Instances record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Configure query condition: Instance status — Code, not equal to
        QueryModal.selectField(instanceFieldValues.instanceStatusCode);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield(testData.instanceStatusCodeId);

        // Add second query condition to filter by instance title to get only our test instance
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.instanceTitle, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 3: Test query and verify preview of found records
        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfRowsInPreviewTable(1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Run query and save
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 5: View updated list
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();
        Lists.waitForCompilingToComplete();

        // Step 6: Open Actions and check available columns in "Show columns"
        Lists.openActions();

        arrayTypeColumns.forEach((column) => {
          QueryModal.verifyCheckboxInShowColumnsChecked(column, false);
        });

        // Step 7: Enable checkboxes for array type fields
        arrayTypeColumns.forEach((column) => {
          QueryModal.selectCheckboxInShowColumns(column);
          QueryModal.verifyCheckboxInShowColumnsChecked(column, true);
        });

        // Step 8: Export selected columns and verify CSV
        Lists.exportListVisibleColumns();
        Lists.verifyCalloutMessage(
          `Export of ${listName} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listName} was successfully exported to CSV.`);

        // Build expected Contributors JSON string for CSV verification
        const contributorsJson = `[{"name": "${testData.contributorName}", "primary": true, "contributorType": "${testData.contributorTypeName}", "contributorTypeId": "${testData.contributorTypeId}", "contributorNameType": "${testData.contributorNameTypeName}", "contributorNameTypeId": "${testData.contributorNameTypeId}"}]`;

        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          listName,
          'Instance - Resource title',
          testData.instanceTitle,
          [
            {
              header: instanceCsvHeaders.statisticalCodeUuids,
              value: testData.statisticalCodeUuids,
            },
            {
              header: instanceCsvHeaders.statisticalCodeNames,
              value: testData.statisticalCode.fullName,
            },
            {
              header: instanceCsvHeaders.contributors,
              value: contributorsJson,
            },
          ],
        );
      },
    );
  });
});
