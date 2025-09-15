import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      subjectValue: `C358530_Subject_${randomPostfix}`,
      instanceTitlePrefix: `AT_C358530_FolioInstance_${getRandomPostfix()}`,
    };

    const createdInstanceIDs = [];

    before('Creating user and instances', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSubjectBrowse.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C358530_FolioInstance');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            const instanceTypeId = instanceTypes[0].id;

            for (let index = 1; index <= 2; index++) {
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
      'C358530 Verify the hit count on Subject browse list (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C358530'] },
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
        BrowseContributors.verifyInventoryBrowsePaneheader();
      },
    );
  });
});
