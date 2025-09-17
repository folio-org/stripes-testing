import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

const browseQuery = `water sky C350707.${getRandomPostfix()}`;
let user;

describe('Inventory', () => {
  describe('Subject Browse', () => {
    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.uiSubjectBrowse.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350707 Check Query parameters Browse subjects (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350707'] },
      () => {
        InventorySearchAndFilter.selectBrowseSubjects();
        cy.intercept('GET', 'browse/subjects/instances?highlightMatch=true*').as(
          'getBrowseSubjects',
        );
        InventorySearchAndFilter.browseSearch(browseQuery);
        cy.wait('@getBrowseSubjects').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.eq(`(value>="${browseQuery}" or value<"${browseQuery}")`);
        });
        BrowseSubjects.verifyNonExistentSearchResult(browseQuery);
      },
    );
  });
});
