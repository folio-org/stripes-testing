import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

let user;
const item = {
  barcode: `barcode-${getRandomPostfix()}`,
  instanceName: `instanceName-${getRandomPostfix()}`,
  instanceSubjectName: `subject-${getRandomPostfix()}`,
};
const randomSearchString = `randomSearchString-${getRandomPostfix()}`;

describe('Inventory', () => {
  describe('Subject Browse', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.uiSubjectBrowse.gui]).then((userProperties) => {
        user = userProperties;
      });

      const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      cy.getInstanceById(instanceId).then((body) => {
        const requestBody = body;
        requestBody.subjects = [{ value: item.instanceSubjectName }];
        cy.updateInstance(requestBody);
      });
    });

    beforeEach('login', () => {
      cy.getAdminToken();
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350392 Verify placeholder for the missing match in subject browse (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350392', 'eurekaPhase1'] },
      () => {
        BrowseSubjects.searchBrowseSubjects(randomSearchString);
        BrowseSubjects.verifyNonExistentSearchResult(randomSearchString);
        BrowseSubjects.verifyClickTakesNowhere(randomSearchString);
      },
    );

    it(
      'C350393 Verify selecting row from Browse Result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350393', 'eurekaPhase1'] },
      () => {
        BrowseSubjects.waitForSubjectToAppear(item.instanceSubjectName);
        BrowseSubjects.searchBrowseSubjects(item.instanceSubjectName);
        BrowseSubjects.verifyClickTakesToInventory(item.instanceSubjectName);
      },
    );
  });
});
