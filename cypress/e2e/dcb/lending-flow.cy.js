import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import { getTestEntityValue } from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import Dcb from '../../support/fragments/dcb/dcb';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe.skip('DCB', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const patronGroup = {
    name: getTestEntityValue('dcb'),
  };
  let userData;
  const dcbTransactionId = uuid();
  const dcbPatron = {
    id: uuid(),
    group: 'staff',
    barcode: uuid(),
  };
  let ITEM_BARCODE;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ limit: 1, query: 'name=="DCB"' }).then((servicePoints) => {
      testData.dcbServicePoint = servicePoints[0];
    });
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
    cy.getItems({ limit: 1, query: `"barcode"=="${ITEM_BARCODE}"` }).then((res) => {
      testData.itemId = res.id;
      cy.log(testData.folioInstances);
      cy.log(testData.itemId);
    });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
      cy.createTempUser(
        [
          Permissions.uiRequestsAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.checkinAll.gui,
          Permissions.uiUserEdit.gui,
        ],
        patronGroup.name,
      )
        .then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.dcbServicePoint.id,
            userData.userId,
            testData.dcbServicePoint.id,
          );
        })
        .then(() => {
          Dcb.createTransactionViaApi(dcbTransactionId, {
            item: {
              id: testData.itemId,
              barcode: ITEM_BARCODE,
            },
            patron: dcbPatron,
            pickup: {
              servicePointId: testData.servicePoint.id,
              servicePointName: testData.servicePoint.name,
              libraryCode: testData.servicePoint.code,
            },
            role: 'LENDER',
          });
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C422200 (DCB) Lending Flow (volaris)',
    { tags: ['criticalPathExclude', 'volarisExclude', 'C422200Exclude'] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.openRequest();
      Requests.waitLoading();
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.checkItemInformation({
        itemBarcode: ITEM_BARCODE,
      });
      RequestDetail.checkRequestInformation({
        status: 'Open - Not yet filled',
      });
      RequestDetail.checkRequesterInformation({
        lastName: 'DcbSystem',
        barcode: dcbPatron.barcode,
        pickupSP: testData.servicePoint.name,
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(dcbPatron.barcode);
      Users.verifyUserTypeOnUserDetailsPane('dcb');

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(ITEM_BARCODE);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();

      cy.getAdminToken();
      Dcb.updateTransactionViaApi(dcbTransactionId, {
        status: 'AWAITING_PICKUP',
      }).then((response) => {
        expect(response.status).equals('AWAITING_PICKUP');
      });

      Dcb.updateTransactionViaApi(dcbTransactionId, {
        status: 'ITEM_CHECKED_OUT',
      }).then((response) => {
        expect(response.status).equals('ITEM_CHECKED_OUT');
      });

      Dcb.updateTransactionViaApi(dcbTransactionId, {
        status: 'ITEM_CHECKED_IN',
      }).then((response) => {
        expect(response.status).equals('ITEM_CHECKED_IN');
      });

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(ITEM_BARCODE);
    },
  );
});
