import checkInPreconditions from '../support/api/checkInPreconditions';
import { ITEM_STATUS_NAMES } from '../support/constants';
import permissions from '../support/dictionary/permissions';
import CheckInPage from '../support/fragments/check-in-actions/checkInPage';
import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../support/fragments/topMenu';
import generateItemBarcode from '../support/utils/generateItemBarcode';
import getRandomPostfix from '../support/utils/stringTools';

describe('Check in', () => {
  const testData = {
    user: {
      permissions: [
        permissions.checkinAll.gui,
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersView.gui,
        permissions.uiInventoryViewInstances.gui,
        permissions.uiUsersFeeFinesCRUD.gui,
      ],
    },
    item: {
      barcode: generateItemBarcode(),
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    checkInRowData: [ITEM_STATUS_NAMES.AVAILABLE],
    location: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      checkInPreconditions.createTestItemViaApi(testData).then(() => {
        checkInPreconditions.createTestUserViaApi(testData).then(() => {
          checkInPreconditions.checkoutItemViaApi(testData);
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      checkInPreconditions.deletePreconditions(testData);
    });
  });

  it(
    'C347631 Check in: Basic check in (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeft'] },
    () => {
      cy.login(testData.user.username, testData.user.password);
      cy.visit(TopMenu.checkInPath);
      CheckInPage.waitLoading();
      CheckInPage.enterItemBarcode(testData.item.barcode);
      CheckInPage.checkResultsInTheRow(testData.checkInRowData);
      CheckInPage.checkActionsMenuOptions();
      CheckInPage.openLoanDetails(testData.user.username);
      CheckInPage.openCheckInApp();
      CheckInPage.openPatronDetails(testData.user.username);
      CheckInPage.openCheckInApp();
      CheckInPage.openItemDetails(testData.item.barcode);
      CheckInPage.openCheckInApp();
      CheckInPage.openNewFeeFinesPane();
      CheckInPage.closeNewFeeFinesPane();
      CheckInPage.openCheckInApp();
      CheckInPage.endSession();
    },
  );
});
