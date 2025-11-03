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
    const instanceTitle = `AT_C357043_FolioInstance_${randomPostfix}`;
    const contributorValue = `AT_C357043_Contributor_${randomPostfix}`;
    const typeFreeTextValue = `AT_C357043_TypeFreeText_${randomPostfix}`;

    let user;
    let createdInstanceId;
    let contributorNameType;
    let contributorType;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C357043_FolioInstance');

          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            contributorNameType = contributorNameTypes[0].name;
            BrowseContributors.getContributorTypes({
              searchParams: { limit: 1, query: 'source<>local' },
            }).then((contributorTypes) => {
              contributorType = contributorTypes[0].name;
              InventoryInstance.createInstanceViaApi({
                instanceTitle,
              }).then(({ instanceData }) => {
                createdInstanceId = instanceData.instanceId;

                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
              });
            });
          });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C357043 Verify that the existing contributor is returned at "Browse contributors" result list when user filled field "Type, free text" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357043'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.verifyInstanceTitle(instanceTitle);
        InstanceRecordView.expandContributorAccordion();
        InventoryInstance.verifyContributor(0, 1, 'No value set-');
        InventorySearchAndFilter.clickEditInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.clickAddContributor();
        InstanceRecordEdit.fillContributorData(
          0,
          contributorValue,
          contributorNameType,
          contributorType,
        );

        InstanceRecordEdit.saveAndClose();
        InventoryInstance.verifyInstanceTitle(instanceTitle);

        BrowseContributors.waitForContributorToAppear(contributorValue);
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultRecord(contributorValue);

        BrowseContributors.openRecord(contributorValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventoryInstance.verifyInstanceTitle(instanceTitle);
        InventoryInstance.verifyContributor(0, 1, contributorValue);
        InventoryInstance.verifyContributor(0, 3, 'No value set-');

        InventorySearchAndFilter.clickEditInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.fillContributorData(
          0,
          contributorValue,
          contributorNameType,
          contributorType,
          typeFreeTextValue,
        );
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.verifyInstanceTitle(instanceTitle);
        InventoryInstance.verifyContributor(0, 1, contributorValue);
        InventoryInstance.verifyContributor(0, 3, typeFreeTextValue);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseContributors.resetAllInSearchPane();
        BrowseContributors.checkBrowseQueryText('');
        BrowseContributors.select();
        BrowseContributors.expandNameTypeSection();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultRecord(contributorValue);
      },
    );
  });
});
