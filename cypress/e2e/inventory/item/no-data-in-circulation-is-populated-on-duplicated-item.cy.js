import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../../support/fragments/check-in-actions/checkInPane';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import CheckOutActions from '../../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe(
    'Item',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      const itemData = {
        barcode: uuid(),
        instanceTitle: `autotestInstance ${getRandomPostfix()}`,
      };
      const holdingsPermanentLocation = LOCATION_NAMES.ONLINE_UI;
      const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
      const testData = [ITEM_STATUS_NAMES.IN_TRANSIT, itemData.barcode];
      const newItemBarcode = uuid();
      const todayDate = moment(new Date()).format('M/D/YYYY');

      beforeEach('Create test data and login', () => {
        cy.getAdminToken()
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              itemData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              itemData.holdingTypeId = res[0].id;
            });
            ServicePoints.createViaApi(servicePoint);
            cy.getLocations({ query: `name="${holdingsPermanentLocation}"` }).then((locations) => {
              testData.locationsId = locations.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              itemData.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              itemData.materialTypeId = res.id;
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
                  permanentLocationId: testData.locationsId,
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

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.checkinAll.gui,
          Permissions.checkoutAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          UserEdit.addServicePointsViaApi([servicePoint.id], user.userId, servicePoint.id);
          cy.login(userProperties.username, userProperties.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          CheckInActions.waitLoading();
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          CheckInActions.checkinItemViaApi({
            itemBarcode: itemData.barcode,
            servicePointId: servicePoint.id,
            checkInDate: new Date().toISOString(),
          });
          UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id]);
          ServicePoints.deleteViaApi(servicePoint.id);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
        });
      });

      it(
        'C397325 Verify that no data in circulation is populated on duplicated Item (folijet)',
        { tags: ['criticalPath', 'folijet', 'C397325', 'shiftLeft'] },
        () => {
          CheckInActions.checkInItemGui(itemData.barcode);
          ConfirmItemInModal.confirmInTransitModal();
          CheckInPane.checkResultsInTheRow(testData);
          CheckInActions.endCheckInSessionAndCheckDetailsOfCheckInAreCleared();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
          Checkout.waitLoading();
          // without this waiter, the user will not be found by username
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(4000);
          CheckOutActions.checkOutUser(user.barcode);
          CheckOutActions.checkOutItem(itemData.barcode);
          CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
          CheckOutActions.endCheckOutSession();
          CheckOutActions.checkDetailsOfCheckOUTAreCleared();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
          InventoryHoldings.checkIfExpanded(`${holdingsPermanentLocation} >`, true);
          InventoryInstance.openItemByBarcode(itemData.barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.verifyItemStatus('Checked out');
          ItemRecordView.checkItemCirculationHistory(todayDate, servicePoint.name, user.username);
          ItemRecordView.duplicateItem();
          ItemRecordNew.waitLoading(itemData.instanceTitle);
          ItemRecordNew.addBarcode(newItemBarcode);
          ItemRecordNew.save();
          ItemRecordView.verifyCalloutMessage();
          ItemRecordView.closeDetailView();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryHoldings.checkIfExpanded(`${holdingsPermanentLocation} >`, true);
          InventoryInstance.openItemByBarcode(newItemBarcode);
          ItemRecordView.checkItemCirculationHistory('-', 'No value set-', '-');
        },
      );
    },
  );
});
