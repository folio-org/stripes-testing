import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C360947_FolioInstance_${randomPostfix}`,
      searchOption: searchInstancesOptions[12], // Subject
      subject: `AT_C360947 Waffles-ABC. Peanut butter version "PeeBeeWaff". 015--Foods ${randomPostfix}`,
    };
    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C360947_FolioInstance');
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
            subjects: [
              {
                value: testData.subject,
              },
            ],
          },
        }).then((instanceData) => {
          instanceIds.push(instanceData.instanceId);
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C360947 Verify search by Subject with quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360947'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
        InventoryInstances.waitContentLoading();

        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.verifyResultPaneEmpty();

        cy.intercept('GET', 'search/instances*').as('getInstances');
        InventoryInstances.searchByTitle(testData.subject);
        cy.wait('@getInstances').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include(
            `(subjects.value==/string "${testData.subject.replace(/"/g, '\\"')}")`,
          );
        });
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
      },
    );
  });
});
