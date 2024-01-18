import { including } from '@interactors/html';

import { REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import InteractorsTools from '../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let firstItemBarcode;
  let secondItemBarcode;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.getUsers({ limit: 1, query: '"barcode"="" and "active"="true"' }).then((users) => {
      testData.requester = users[0];
    });
    firstItemBarcode = testData.folioInstances[0].barcodes[0];
    secondItemBarcode = testData.folioInstances[1].barcodes[0];
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    TitleLevelRequests.changeTitleLevelRequestsStatus('allow');

    cy.createTempUser(
      [
        Permissions.checkoutAll.gui,
        Permissions.uiRequestsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.circulationLogAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.loansAll.gui,
        Permissions.loansRenewOverride.gui,
      ],
      patronGroup.name,
    ).then((user) => {
      testData.user = user;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcodes[0],
        servicePointId: testData.servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });

    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C380500: Editing recall request does not change recalled item (vega) (TaaS)',
    {
      tags: ['criticalPath', 'vega'],
    },
    () => {
      // Enter patron id or choose patron with "Patron look-up" function.
      CheckOutActions.checkOutUser(testData.user.barcode);
      // Enter barcode for one of the items (described in Preconditions).
      CheckOutActions.checkOutItem(firstItemBarcode);
      Checkout.verifyResultsInTheRow([firstItemBarcode]);
      // Check out the second item from the instance described in Preconditions to another Patron.
      CheckOutActions.checkOutItem(secondItemBarcode);
      Checkout.verifyResultsInTheRow([secondItemBarcode]);
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${testData.folioInstances[0].instanceId}"`,
      }).then((instance) => {
        NewRequest.enterHridInfo(instance.hrid);
      });
      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: testData.requester.barcode,
          pickupServicePoint: testData.servicePoint.name,
        },
        REQUEST_TYPES.RECALL,
      );
      NewRequest.verifyRequestInformation(REQUEST_TYPES.HOLD);
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      RequestDetail.checkItemBarcode(testData.requester.barcode);
      RequestDetail.checkRequestsCount('1');

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      SearchPane.searchByItemBarcode(firstItemBarcode);
      SearchPane.searchByLoanType('Recall requested');
      SearchPane.checkResultSearch({
        itemBarcode: firstItemBarcode,
        circAction: 'Recall requested',
      });

      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      EditRequest.findAndOpenCreatedRequest({
        instanceTitle: testData.folioInstances[0].instanceTitle,
      });
      EditRequest.editPickupServicePoint();
      InteractorsTools.checkCalloutMessage(including('Request has been successfully edited for'));
      RequestDetail.openItemByBarcode(firstItemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.openBorrowerPage();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(firstItemBarcode);
      UserLoans.renewItem(firstItemBarcode, true);
      RenewConfirmationModal.verifyRenewConfirmationModal(
        [
          {
            itemBarcode: firstItemBarcode,
            status: 'Item not renewed:',
          },
        ],
        true,
      );
    },
  );
});
