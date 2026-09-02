import Permissions from '../../../../support/dictionary/permissions';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

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

const testCaseId = 'C1464060';
const titlePrefix = `AT_${testCaseId}_Instance`;
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};
const testData = {
  instanceTypeId: null,
  alternativeTitleTypeId: null,
  alternativeTitleTypeName: null,
  contributorNameTypeId: null,
  contributorNameTypeName: null,
  contributorTypeId: null,
  contributorTypeName: null,
  instance: {
    title: `${titlePrefix}_${getRandomPostfix()}`,
    id: null,
    hrid: null,
    alternativeTitle: 'alt title',
    contributorName: 'best contributor',
  },
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`AT_${testCaseId}`);

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });

        // Get alternative title types
        cy.getAlternativeTitlesTypes({ limit: 100 }).then((types) => {
          const coverTitleType = types.find((type) => type.name === 'Cover title');
          testData.alternativeTitleTypeId = coverTitleType?.id;
          testData.alternativeTitleTypeName = coverTitleType?.name;
        });

        // Get contributor name types
        BrowseContributors.getContributorNameTypes({
          searchParams: {
            limit: 500,
          },
        }).then((types) => {
          const personalNameType = types.find((type) => type.name === 'Personal name');
          testData.contributorNameTypeId = personalNameType?.id;
          testData.contributorNameTypeName = personalNameType?.name;
        });

        // Get contributor types
        BrowseContributors.getContributorTypes({ searchParams: { limit: 200 } }).then((types) => {
          const actorType = types.find((type) => type.name === 'Actor');
          testData.contributorTypeId = actorType?.id;
          testData.contributorTypeName = actorType?.name;
        });

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instance.title,
              alternativeTitles: [
                {
                  alternativeTitleTypeId: testData.alternativeTitleTypeId,
                  alternativeTitle: testData.instance.alternativeTitle,
                },
              ],
              contributors: [
                {
                  name: testData.instance.contributorName,
                  contributorNameTypeId: testData.contributorNameTypeId,
                  contributorTypeId: testData.contributorTypeId,
                  primary: true,
                },
              ],
            },
          }).then(({ instanceId }) => {
            testData.instance.id = instanceId;
            cy.getInstanceById(instanceId).then((instance) => {
              testData.instance.hrid = instance.hrid;
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
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1464060 Verify that the fields "Instance — Alternative titles — Alternative title type", "Instance — Contributors — type", "Instance — Contributors — Name type" fields are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464060'] },
        () => {
          // Step 1: Create new list with Instances record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Configure the following query with three AND conditions
          QueryModal.selectField(instanceFieldValues.alternativeTitlesAlternativeTitleType);
          QueryModal.verifySelectedField(instanceFieldValues.alternativeTitlesAlternativeTitleType);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(testData.alternativeTitleTypeName);

          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.contributorNameType, 1);
          QueryModal.verifySelectedField(instanceFieldValues.contributorNameType, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.contributorNameTypeName, 1);

          QueryModal.addNewRow(1);
          QueryModal.selectField(instanceFieldValues.contributorType, 2);
          QueryModal.verifySelectedField(instanceFieldValues.contributorType, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect(testData.contributorTypeName, 2);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 3: Check the preview of found records
          QueryModal.verifyColumnDisplayed(instanceFieldValues.alternativeTitles);
          QueryModal.verifyColumnDisplayed(instanceFieldValues.contributors);
          QueryModal.verifyAlternativeTitlesEmbeddedTableInQueryModal(testData.instance.hrid, [
            {
              alternativeTitle: testData.instance.alternativeTitle,
              alternativeTitleType: testData.alternativeTitleTypeName,
            },
          ]);
          QueryModal.verifyContributorsEmbeddedTableInQueryModal(
            testData.instance.hrid,
            [
              {
                name: testData.instance.contributorName,
                contributorNameType: testData.contributorNameTypeName,
                contributorType: testData.contributorTypeName,
                primary: 'True',
              },
            ],
            1,
          );

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify refresh complete and view updated list
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instance.hrid);

            // Step 6: Verify columns display Instance — Alternative titles and Instance — Contributors with proper values
            Lists.verifyResultColumnDisplayed(instanceFieldValues.alternativeTitles);
            Lists.verifyResultColumnDisplayed(instanceFieldValues.contributors);

            Lists.verifyEmbeddedTableInResultsRow('alternativeTitles', testData.instance.hrid, {
              alternativeTitle: testData.instance.alternativeTitle,
              alternativeTitleType: testData.alternativeTitleTypeName,
            });
            Lists.verifyEmbeddedTableInResultsRow(
              'contributors',
              testData.instance.hrid,
              {
                name: testData.instance.contributorName,
                contributorNameType: testData.contributorNameTypeName,
                contributorType: testData.contributorTypeName,
                primary: 'True',
              },
              1,
            );
          });
        },
      );
    });
  });
});
