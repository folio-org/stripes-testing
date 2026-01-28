/* eslint-disable no-unused-vars */
import moment from 'moment';
import { v4 as uuid } from 'uuid';

import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InTransit from '../../../support/fragments/checkin/modals/inTransit';
import SearchPane from '../../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';
import UserEdit from '../../../support/fragments/users/userEdit';

describe('Service Points Switching for Check In', () => {
  const { user, memberTenant } = parseSanityParameters();
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 2 }),
    servicePointA: {},
    servicePointB: {},
  };
  let defaultLocation = null;

  before('Preconditions', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password)
      .then(() => {
        // Fetch user details (REQUIRED)
        cy.getUserDetailsByUsername(user.username)
          .then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          })
          .then(() => {
            // Get existing service points
            cy.getUserServicePoints(user.id).then((userServicePoints) => {
              const servicePointIds = userServicePoints[0].servicePointsIds;
              // Fetch service point details to get names
              ServicePoints.getViaApi({ limit: 100 }).then((servicePoints) => {
                const spA = servicePoints.find((sp) => sp.id === servicePointIds[0]);
                const spB = servicePoints.find(
                  (sp) => sp.id === servicePointIds[1] || sp.id === servicePointIds[0],
                );
                testData.servicePointA.id = spA.id;
                testData.servicePointA.name = spA.name;
                testData.servicePointB.id = spB.id;
                testData.servicePointB.name = spB.name;
              });
            });
          });

        // Defensive cleanup
        InventoryInstances.deleteInstanceByTitleViaApi(testData.folioInstances[0].instanceTitle);
      })
      .then(() => {
        // Create test location using existing service point
        defaultLocation = Locations.getDefaultLocation({
          servicePointId: testData.servicePointA.id,
        }).location;

        Locations.createViaApi(defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      })
      .then(() => {
        // Checkout items
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: testData.folioInstances[0].items[0].barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePointA.id,
          userBarcode: user.barcode,
        });

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: testData.folioInstances[0].items[1].barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePointA.id,
          userBarcode: user.barcode,
        });
      });
  });

  after('Cleanup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);

    if (testData.folioInstances?.[0] && testData.servicePointA) {
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePointA,
        shouldCheckIn: true,
      });
    }

    if (defaultLocation) {
      Locations.deleteViaApi(defaultLocation);
    }
  });

  it(
    'C425 Service Points: Test that service points switching working properly for check in (volaris)',
    { tags: ['dryRun', 'volaris', 'C425'] },
    () => {
      const firstItem = testData.folioInstances[0].items[0];
      const secondItem = testData.folioInstances[0].items[1];
      cy.login(user.username, user.password, {
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

      const expectedFirstItemData = {
        itemBarcode: firstItem.barcode,
        circAction: 'Checked in',
        servicePoint: testData.servicePointA.name,
      };
      SearchPane.findResultRowIndexByContent(expectedFirstItemData.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedFirstItemData, rowIndex);
      });

      SearchPane.searchByItemBarcode(secondItem.barcode);

      const expectedSecondItemData = {
        itemBarcode: secondItem.barcode,
        circAction: 'Checked in',
        servicePoint: testData.servicePointB.name,
      };
      SearchPane.findResultRowIndexByContent(expectedSecondItemData.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedSecondItemData, rowIndex);
      });
    },
  );
});
