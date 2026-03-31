import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import UserCharge from '../../support/fragments/users/userCharge';
import { ITEM_STATUS_NAMES, LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';

describe('Check in', () => {
  describe(
    'End to end scenarios',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const userData = {
        permissions: [
          permissions.checkinAll.gui,
          permissions.uiUsersViewLoans.gui,
          permissions.uiUsersView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.uiUsersfeefinesCRUD.gui,
        ],
      };
      const testData = {
        feeFineAmount: '10',
      };
      let itemData;
      let servicePoint;
      let checkInResultsData;

      beforeEach('Create New Item, New User and Check out item', () => {
        itemData = {
          barcode: `test/${getRandomPostfix()}`,
          instanceTitle: `C552474_Instance_${getRandomPostfix()}`,
        };
        checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

        cy.getAdminToken()
          .then(() => {
            ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
              servicePoint = sp;
              checkInResultsData.push(LOCATION_NAMES.MAIN_LIBRARY_UI);
            });
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              itemData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              itemData.holdingTypeId = res[0].id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              itemData.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              itemData.materialTypeId = res.id;
              itemData.materialTypeName = res.name;
              checkInResultsData.push(`${itemData.instanceTitle} (${itemData.materialTypeName})`);
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: itemData.instanceTypeId,
                title: itemData.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: itemData.holdingTypeId,
                  permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
                },
              ],
              items: [
                {
                  barcode: itemData.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: itemData.loanTypeId },
                  materialType: { id: itemData.materialTypeId },
                },
              ],
            });
          })
          .then((specialInstanceIds) => {
            itemData.testInstanceIds = specialInstanceIds;
          });

        UsersOwners.createViaApi({ owner: uuid() }).then(({ id, owner }) => {
          testData.ownerId = id;
          testData.owner = owner;
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: id,
            defaultAmount: testData.chargeAmount,
          }).then((manualCharge) => {
            testData.manualChargeId = manualCharge.id;
            testData.feeFineType = manualCharge.feeFineType;
          });
        });

        cy.createTempUser(userData.permissions)
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: itemData.barcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: userData.barcode,
            });
            cy.wait(10000);
          });
      });

      afterEach('Delete New Service point, Item and User', () => {
        cy.getAdminToken();
        ManualCharges.deleteViaApi(testData.manualChargeId);
        UsersOwners.deleteViaApi(testData.ownerId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C552474 Check that user can assign fee/fine after check in and Item with "/" in barcode (vega)',
        { tags: ['extendedPath', 'vega', 'C552474'] },
        () => {
          // Login and go to Check in
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });

          // 1. Scan Item barcode from preconditions
          CheckInActions.checkInItemGui(itemData.barcode);
          CheckInActions.verifyLastCheckInItem(itemData.barcode);

          // 2. Click on "..." button under the "Actions" column > select "New Fee/Fine" action
          CheckInActions.openNewFeeFinesPane();
          UserCharge.waitLoading();

          // 3. Fill all mandatory fields. Click "Charge only" button
          UserCharge.fillRequiredFields(
            testData.owner,
            testData.feeFineType,
            testData.feeFineAmount,
          );
          UserCharge.chargeOnly();
          CheckInActions.checkFeesFinesOwedPresent();

          // // 4. Click on "..." button under the "Actions" column > select "Fee/Fine details" action
          CheckInActions.openFeeFineDetails();
          CheckInActions.checkFeeFinesDetailsByFields({
            Barcode: itemData.barcode,
            'Instance (Material type)': itemData.instanceTitle,
            'Fee/fine owner': testData.owner,
            'Fee/fine type': testData.feeFineType,
            'Billed amount': testData.feeFineAmount,
          });
        },
      );
    },
  );
});
