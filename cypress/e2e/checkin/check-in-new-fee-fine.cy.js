import moment from 'moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Modals from '../../support/fragments/modals';
import { ITEM_STATUS_NAMES, LOCATION_IDS } from '../../support/constants';

describe('Check in', () => {
  describe('Fee/Fine', () => {
    const testData = {
      itemBarcode: generateItemBarcode(),
      instanceTitle: `C6668_Instance_${getRandomPostfix()}`,
    };
    let servicePoint;
    let user;

    before(() => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
            servicePoint = sp;
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.checkinAll.gui,
            Permissions.uiFeeFinesActions.gui,
            Permissions.uiUserAccounts.gui,
            Permissions.uiUsersfeefinesCRUD.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersView.gui,
            Permissions.uiUsersViewLoans.gui,
          ]).then((userProperties) => {
            user = userProperties;
            UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: testData.itemBarcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: user.barcode,
            });
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: servicePoint.id,
        checkInDate: moment.utc().format(),
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C6668 Verify behavior when "New fee/fine" ellipsis option selected within Check-in process (vega)',
      { tags: ['extendedPath', 'vega', 'C6668'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });

        // Step 1: Scan Item that was checked out in preconditions
        CheckInActions.checkInItemGui(testData.itemBarcode);
        Modals.closeModalWithPrintSlipCheckboxIfAny();
        CheckInActions.verifyLastCheckInItem(testData.itemBarcode);

        // Step 2: Click on "..." button next to the checked in record > select "New fee/fine"
        CheckInActions.openNewFeeFinesPane();

        // Verify "New fee/fine" modal opened with populated item's data
        NewFeeFine.waitLoading();
        NewFeeFine.verifyItemDataPopulated({
          barcode: testData.itemBarcode,
          instanceTitle: testData.instanceTitle,
        });
      },
    );
  });
});
