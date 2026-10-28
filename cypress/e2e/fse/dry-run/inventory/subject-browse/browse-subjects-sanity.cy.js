import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
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

      // createInstanceViaApi hardcodes a "Main Library" location lookup (may not exist on a
      // dry-run env) and re-authenticates as a hardcoded "diku" admin login, overriding this
      // spec's own member-tenant/user context set up above - use the lower-level API helper
      // with a dynamically-fetched location instead, staying in the active tenant context
      const testData = {};
      let instanceId;

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: item.instanceName,
              instanceTypeId: testData.instanceTypeId,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
                sourceId: testData.sourceId,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((createdInstance) => {
            instanceId = createdInstance.instanceId;
          });
        })
        .then(() => {
          cy.getInstanceById(instanceId).then((body) => {
            const requestBody = body;
            requestBody.subjects = [{ value: item.instanceSubjectName }];
            cy.updateInstance(requestBody);
          });
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
