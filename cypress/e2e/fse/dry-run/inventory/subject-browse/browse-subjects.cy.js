import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

const item = {
  barcode: `barcode-${getRandomPostfix()}`,
  instanceName: `instanceName-${getRandomPostfix()}`,
  instanceSubjectName: `subject-${getRandomPostfix()}`,
};
const randomSearchString = `randomSearchString-${getRandomPostfix()}`;

describe('Inventory', () => {
  describe('Subject Browse', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });

      const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      cy.getInstanceById(instanceId).then((body) => {
        const requestBody = body;
        requestBody.subjects = [{ value: item.instanceSubjectName }];
        cy.updateInstance(requestBody);
      });
    });

    beforeEach('login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    });

    it(
      'C350392 Verify placeholder for the missing match in subject browse (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C350392', 'eurekaPhase1'] },
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
