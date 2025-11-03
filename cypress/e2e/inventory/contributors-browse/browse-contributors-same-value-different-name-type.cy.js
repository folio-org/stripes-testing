import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C357548_FolioInstance_${randomPostfix}`;
    const instanceTitles = [`${instanceTitlePrefix}_First`, `${instanceTitlePrefix}_Second`];
    const contributorValue = `AT_C357548_Contributor_${randomPostfix}`;

    let user;
    const createdInstanceIds = [];
    const contributorNameTypes = [];
    let contributorType;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C357548_FolioInstance');

          cy.then(() => {
            BrowseContributors.getContributorNameTypes({ searchParams: { limit: 2 } }).then(
              (nameTypes) => {
                contributorNameTypes.push(...nameTypes.map((el) => el.name));
              },
            );
            BrowseContributors.getContributorTypes({
              searchParams: { limit: 1, query: 'source<>local' },
            }).then((contributorTypes) => {
              contributorType = contributorTypes[0].name;
            });
          })
            .then(() => {
              instanceTitles.forEach((instanceTitle) => {
                InventoryInstance.createInstanceViaApi({
                  instanceTitle,
                }).then(({ instanceData }) => {
                  createdInstanceIds.push(instanceData.instanceId);
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C357548 Verify that when user clicks on a contributor\'s name at browse result list, search for contributor also considers "Name type" value. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357548'] },
      () => {
        instanceTitles.forEach((instanceTitle, index) => {
          InventoryInstances.searchByTitle(createdInstanceIds[index]);
          InventoryInstances.selectInstanceById(createdInstanceIds[index]);
          InventoryInstance.verifyInstanceTitle(instanceTitle);
          InstanceRecordView.expandContributorAccordion();
          InventoryInstance.verifyContributor(0, 1, 'No value set-');
          InventorySearchAndFilter.clickEditInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.clickAddContributor();
          InstanceRecordEdit.fillContributorData(
            0,
            contributorValue,
            contributorNameTypes[index],
            contributorType,
          );

          InstanceRecordEdit.saveAndClose();
          InventoryInstance.verifyInstanceTitle(instanceTitle);
        });

        BrowseContributors.waitForContributorToAppear(contributorValue, true, false, 2);
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultRow(
          contributorValue,
          contributorNameTypes[0],
          contributorType,
          '1',
          true,
        );
        BrowseContributors.checkSearchResultRow(
          contributorValue,
          contributorNameTypes[1],
          contributorType,
          '1',
          true,
        );

        BrowseContributors.openRecordWithValues(contributorValue, contributorNameTypes[1]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
      },
    );
  });
});
