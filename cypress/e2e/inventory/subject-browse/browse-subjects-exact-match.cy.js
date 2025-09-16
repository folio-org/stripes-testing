import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      subjectValue: `C357531_Subject_${randomPostfix}`,
      instanceTitlePrefix: `AT_C357531_FolioInstance_${getRandomPostfix()}`,
      numberOfTitles: 3,
    };

    const createdInstanceIDs = [];

    before('Creating user and instances', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSubjectBrowse.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C357531_FolioInstance');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            const instanceTypeId = instanceTypes[0].id;

            for (let index = 1; index <= testData.numberOfTitles; index++) {
              InventoryInstances.createFolioInstanceViaApi({
                instance: { title: `${testData.instanceTitlePrefix} ${index}`, instanceTypeId },
              }).then((instanceData) => {
                cy.getInstanceById(instanceData.instanceId).then((body) => {
                  const requestBody = body;
                  requestBody.subjects = [{ value: testData.subjectValue }];
                  cy.updateInstance(requestBody);
                });
                createdInstanceIDs.push(instanceData.instanceId);
              });
            }
          });
        },
      );
    });

    after('Deleting user and instance', () => {
      cy.getAdminToken();
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C357531 Verify exact match for subjects selected on the browse form (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357531'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        }, 20_000);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);
        BrowseSubjects.searchBrowseSubjects(testData.subjectValue);
        BrowseSubjects.checkSearchResultsTable();
        BrowseSubjects.checkValueIsBold(testData.subjectValue);
        BrowseCallNumber.checkNumberOfTitlesForRow(testData.subjectValue, '3');
        BrowseSubjects.openInstance({ name: testData.subjectValue });
        InventorySearchAndFilter.verifyResultListExists();
        for (let index = 1; index <= testData.numberOfTitles; index++) {
          InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix} ${index}`);
        }
        InventorySearchAndFilter.verifyNumberOfSearchResults(testData.numberOfTitles);
      },
    );
  });
});
