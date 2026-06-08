import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const REQUESTS_TITLE_PREFIX = 'Requests';
const FOLIO_SUFFIX = 'FOLIO';

describe('Requests: HTML Page titles', () => {
  let userId;
  let requestData;
  let instanceData;

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      Requests.createRequestApi().then(({ createdUser, createdRequest, instanceRecordData }) => {
        userId = createdUser.id;
        requestData = createdRequest;
        instanceData = instanceRecordData;
      });
    });

    cy.loginAsAdmin({
      path: TopMenu.requestsPath,
      waiter: Requests.waitLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `"title"=="${instanceData.instanceTitle}"`,
    }).then((instance) => {
      cy.deleteItemViaApi(instance.items[0].id);
      cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
      InventoryInstance.deleteInstanceViaApi(instance.id);
    });
    Requests.deleteRequestViaApi(requestData.id).then(() => {
      Users.deleteViaApi(userId);
    });
  });

  it(
    'C440065 Checking HTML page title on "Requests" app - (Search and browse) (vega)',
    { tags: ['extendedPath', 'vega', 'C440065'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();

      // Step 1-2: Enter instance title as search term and verify title includes term + "Search"
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.verifyPageTitle(
        `${REQUESTS_TITLE_PREFIX} - ${instanceData.instanceTitle} - Search - ${FOLIO_SUFFIX}`,
      );

      // Step 3: Click "Reset all" and verify title returns to base Requests title
      Requests.clickResetAllButton();
      Requests.verifyPageTitle(`${REQUESTS_TITLE_PREFIX} - ${FOLIO_SUFFIX}`);
    },
  );

  it(
    'C440107 Checking HTML page title on "Requests app" - Request detail pane (vega)',
    { tags: ['extendedPath', 'vega', 'C440107'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();

      // Step 1: Open the created request by searching its instance title
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.selectFirstRequest(instanceData.instanceTitle);

      // Step 2: Verify title includes the instance title (Record title of the requested item)
      Requests.verifyPageTitle(
        `${REQUESTS_TITLE_PREFIX} - ${instanceData.instanceTitle} - ${FOLIO_SUFFIX}`,
      );
    },
  );
});
