import moment from 'moment';
import { v4 as uuid } from 'uuid';

import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Service Points Switching for Check In', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 2 }),
    servicePointA: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePointB: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    userGroup: getTestEntityValue('staff$'),
  };

  let patronGroupId = '';

  testData.servicePointA.name = `ServicePointA_${getTestEntityValue()}`;
  testData.servicePointB.name = `ServicePointB_${getTestEntityValue()}`;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePointA);
      ServicePoints.createViaApi(testData.servicePointB);

      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePointA.id,
      }).location;

      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });

      PatronGroups.createViaApi(testData.userGroup).then((patronGroupResponse) => {
        patronGroupId = patronGroupResponse;

        cy.createTempUser(
          [
            permissions.checkinAll.gui,
            permissions.circulationLogAll.gui,
            permissions.checkoutCirculatingItems.gui,
            permissions.uiUsersView.gui,
            permissions.inventoryAll.gui,
          ],
          testData.userGroup,
        ).then((userProperties) => {
          testData.user = userProperties;

          UserEdit.addServicePointsViaApi(
            [testData.servicePointA.id, testData.servicePointB.id],
            testData.user.userId,
            testData.servicePointA.id,
          );

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: testData.folioInstances[0].items[0].barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.servicePointA.id,
            userBarcode: testData.user.barcode,
          });

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: testData.folioInstances[0].items[1].barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.servicePointA.id,
            userBarcode: testData.user.barcode,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePointA,
        shouldCheckIn: true,
      });

      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.servicePointA.id,
        testData.servicePointB.id,
      ]);
      Users.deleteViaApi(testData.user.userId);

      PatronGroups.deleteViaApi(patronGroupId);

      Locations.deleteViaApi(testData.defaultLocation);

      ServicePoints.deleteViaApi(testData.servicePointA.id);
      ServicePoints.deleteViaApi(testData.servicePointB.id);
    });
  });

  it(
    'C425 Service Points: Test that service points switching working properly for check in (volaris)',
    { tags: ['extendedPath', 'volaris', 'C425'] },
    () => {
      const firstItem = testData.folioInstances[0].items[0];
      const secondItem = testData.folioInstances[0].items[1];
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });

      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointA.name);
      CheckInActions.checkInItemGui(firstItem.barcode);
      SwitchServicePoint.switchServicePoint(testData.servicePointB.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointB.name);
      CheckInActions.checkInItemGui(secondItem.barcode);

      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();

      SearchPane.searchByItemBarcode(firstItem.barcode);
      SearchPane.findResultRowIndexByContent(firstItem.barcode).then((rowIndex) => {
        const expectedFirstItemData = {
          itemBarcode: firstItem.barcode,
          circAction: 'Checked in',
          servicePoint: testData.servicePointA.name,
        };
        SearchPane.checkResultSearch(expectedFirstItemData, rowIndex);
      });

      SearchPane.searchByItemBarcode(secondItem.barcode);
      SearchPane.findResultRowIndexByContent(secondItem.barcode).then((rowIndex) => {
        const expectedSecondItemData = {
          itemBarcode: secondItem.barcode,
          circAction: 'Checked in',
          servicePoint: testData.servicePointB.name,
        };
        SearchPane.checkResultSearch(expectedSecondItemData, rowIndex);
      });
    },
  );
});
