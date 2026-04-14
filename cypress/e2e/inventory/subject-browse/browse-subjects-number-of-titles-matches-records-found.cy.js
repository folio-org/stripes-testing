import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      subjectValue: `C398004_Subject_${getRandomPostfix()}`,
      instanceTitlePrefix: `AT_C398004_FolioInstance_${getRandomPostfix()}`,
      numberOfTitles: 3,
    };

    const createdInstanceIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSubjectBrowse.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C398004_FolioInstance');

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

    after('Delete test data', () => {
      cy.getAdminToken();
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C398004 Verify that "Number of titles" column value matches with "Records found" counter when browsing for subjects (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C398004'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);

        // Step 1: Input query in browse field
        BrowseSubjects.searchBrowseSubjects(testData.subjectValue);

        // Step 2: Verify subject list returned with exact match highlighted in bold
        BrowseSubjects.checkValueIsBold(testData.subjectValue);

        // Step 3: Note "Number of titles" value and click the highlighted subject
        BrowseCallNumber.checkNumberOfTitlesForRow(testData.subjectValue, testData.numberOfTitles);
        BrowseSubjects.openInstance({ name: testData.subjectValue });

        // Verify "Records found" counter matches the noted "Number of titles" value
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.verifyNumberOfSearchResults(testData.numberOfTitles);
      },
    );
  });
});
