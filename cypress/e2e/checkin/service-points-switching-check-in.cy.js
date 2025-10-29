import moment from 'moment';
import { v4 as uuid } from 'uuid';

import permissions from '../../support/dictionary/permissions';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
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
    userGroup: getTestEntityValue('staff$'),
  };

  let patronGroupId = '';
  let servicePointA;
  let servicePointB;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
        servicePointA = sp1;
      });
      ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
        servicePointB = sp2;
      });

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
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
            [servicePointA.id, servicePointB.id],
            testData.user.userId,
            servicePointA.id,
          );

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: testData.folioInstances[0].items[0].barcode,
            loanDate: moment.utc().format(),
            servicePointId: servicePointA.id,
            userBarcode: testData.user.barcode,
          });

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: testData.folioInstances[0].items[1].barcode,
            loanDate: moment.utc().format(),
            servicePointId: servicePointA.id,
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
        servicePoint: servicePointA,
        shouldCheckIn: true,
      });
      Users.deleteViaApi(testData.user.userId);
      PatronGroups.deleteViaApi(patronGroupId);
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

      SwitchServicePoint.checkIsServicePointSwitched(servicePointA.name);
      CheckInActions.checkInItemGui(firstItem.barcode);
      SwitchServicePoint.switchServicePoint(servicePointB.name);
      SwitchServicePoint.checkIsServicePointSwitched(servicePointB.name);
      CheckInActions.checkInItemGui(secondItem.barcode);

      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();

      SearchPane.searchByItemBarcode(firstItem.barcode);

      const expectedFirstItemData = {
        itemBarcode: firstItem.barcode,
        circAction: 'Checked in',
        servicePoint: servicePointA.name,
      };
      SearchPane.findResultRowIndexByContent(expectedFirstItemData.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedFirstItemData, rowIndex);
      });

      SearchPane.searchByItemBarcode(secondItem.barcode);

      const expectedSecondItemData = {
        itemBarcode: secondItem.barcode,
        circAction: 'Checked in',
        servicePoint: servicePointB.name,
      };
      SearchPane.findResultRowIndexByContent(expectedSecondItemData.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedSecondItemData, rowIndex);
      });
    },
  );
});
