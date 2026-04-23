import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  describe('Sorting', () => {
    const testData = {
      requests: [],
    };
    const REQUEST_COUNT = 202;
    let itemBarcodePrefix;

    before('Create test data', () => {
      const postfix = getRandomPostfix();
      itemBarcodePrefix = `AT_C627454_${postfix}`;

      cy.getAdminToken()
        .then(() => {
          cy.createTempUser([]).then((userProperties) => {
            testData.requester = userProperties;
          });
        })
        .then(() => {
          Requests.createRequestsForPagination(
            REQUEST_COUNT,
            itemBarcodePrefix,
            testData.requester.userId,
          ).then((data) => {
            testData.requests = data.requests;
            testData.instanceIds = data.instanceIds;
            testData.loanTypeId = data.loanTypeId;
            testData.servicePoints = data.servicePoints;
            testData.servicePointIds = data.servicePointIds;
            testData.locationA = data.locationA;
            testData.locationB = data.locationB;
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.uiRequestsView.gui]).then((userProperties) => {
            testData.user = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoints[0].id,
              testData.user.userId,
              testData.servicePoints[0].id,
            );
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.requests.forEach((requestId) => {
        Requests.deleteRequestViaApi(requestId);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(`${itemBarcodePrefix}_0`, {
        searchParams: {
          query: `barcode=="${itemBarcodePrefix}*"`,
        },
      });
      cy.deleteLoanType(testData.loanTypeId);
      Users.deleteViaApi(testData.requester.userId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, testData.servicePointIds);
      Users.deleteViaApi(testData.user.userId);
      testData.servicePointIds.forEach((id) => ServicePoints.deleteViaApi(id));
      Locations.deleteViaApi({
        id: testData.locationA.location.id,
        libraryId: testData.locationA.library.id,
        campusId: testData.locationA.campus.id,
        institutionId: testData.locationA.institution.id,
      });
      Locations.deleteViaApi({
        id: testData.locationB.location.id,
        libraryId: testData.locationB.library.id,
        campusId: testData.locationB.campus.id,
        institutionId: testData.locationB.institution.id,
      });
    });

    it(
      'C627454 Sorting requests by "Retrieval service point" and pagination with applied sorting (volaris)',
      { tags: ['extendedPath', 'volaris', 'C627454'] },
      () => {
        // Step 1: Perform search to retrieve at least 201 requests
        Requests.selectRetrievalServicePointColumnInActions(true);
        Requests.selectNotYetFilledRequest();
        // 201+ requests confirmed by Next pagination button being active (page size = 200)
        Requests.verifyResultCount(REQUEST_COUNT);
        Requests.verifyNextPageButtonState(true);

        // Step 2: Click "Retrieval service point" column once → ascending a-z
        Requests.clickRetrievalServicePointColumnHeader();
        Requests.verifyRetrievalServicePointColumnSortOrder('ascending');
        // Total count does not change
        Requests.verifyResultCount(REQUEST_COUNT);

        // Step 3: Click "Next" on pagination bar → second page
        Requests.clickNextPageButton();
        Requests.verifyRetrievalServicePointColumnSortOrder('ascending');
        Requests.verifyNextPageButtonState(true);
        Requests.verifyPreviousPageButtonState(true);

        // Step 4: Navigate to last page (may require several Next clicks)
        Requests.navigateToLastPage();
        Requests.verifyRetrievalServicePointColumnSortOrder('ascending');
        Requests.verifyNextPageButtonState(false);
        Requests.verifyPreviousPageButtonState(true);

        // Step 5: Navigate to first page (may require several Previous clicks)
        Requests.navigateToFirstPage();
        Requests.verifyRetrievalServicePointColumnSortOrder('ascending');
        Requests.verifyNextPageButtonState(true);
        Requests.verifyPreviousPageButtonState(false);

        // Step 6: Click "Retrieval service point" column again → descending z-a
        Requests.clickRetrievalServicePointColumnHeader();
        Requests.verifyRetrievalServicePointColumnSortOrder('descending');
        // Total count does not change
        Requests.verifyResultCount(REQUEST_COUNT);

        // Step 7: Repeat steps 3-5 for descending order
        // Step 7.3: Click Next
        Requests.clickNextPageButton();
        Requests.verifyRetrievalServicePointColumnSortOrder('descending');
        Requests.verifyNextPageButtonState(true);
        Requests.verifyPreviousPageButtonState(true);

        // Step 7.4: Navigate to last page
        Requests.navigateToLastPage();
        Requests.verifyRetrievalServicePointColumnSortOrder('descending');
        Requests.verifyNextPageButtonState(false);
        Requests.verifyPreviousPageButtonState(true);

        // Step 7.5: Navigate to first page
        Requests.navigateToFirstPage();
        Requests.verifyRetrievalServicePointColumnSortOrder('descending');
        Requests.verifyNextPageButtonState(true);
        Requests.verifyPreviousPageButtonState(false);

        // Step 8: Click "Reset all" → search and filter results cleared
        Requests.clickResetAllButton();

        // Step 9: Perform search again to retrieve 201+ requests
        // Default sorting by "Request date" is applied
        Requests.selectNotYetFilledRequest();
        Requests.verifyResultCount(REQUEST_COUNT);
        Requests.getSortOrder('requestdate').then((order) => {
          expect(order).to.be.oneOf(['ascending', 'none']);
        });

        // Step 10: Click Next then click "Retrieval service point" column once
        // → sorting applied, user returned to first page
        Requests.clickNextPageButton();
        Requests.clickRetrievalServicePointColumnHeader();
        Requests.verifyRetrievalServicePointColumnSortOrder('ascending');
        Requests.verifyPreviousPageButtonState(false);

        // Step 11: Navigate to last page, then click "Retrieval service point" again
        // → sorting changes ascending→descending, user returned to first page
        Requests.navigateToLastPage();
        Requests.clickRetrievalServicePointColumnHeader();
        Requests.verifyRetrievalServicePointColumnSortOrder('descending');
        Requests.verifyPreviousPageButtonState(false);
      },
    );
  });
});
