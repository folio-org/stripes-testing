import { ITEM_STATUS_NAMES, LOCATION_IDS } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Check out', () => {
  const patronGroup = getTestEntityValue('patronGroup');
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('Instance'),
  };
  let userData = {};
  let patronGroupId;
  let servicePoint;

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
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
        });
        PatronGroups.createViaApi(patronGroup).then((id) => {
          patronGroupId = id;
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

    cy.createTempUser([permissions.checkoutAll.gui], patronGroup)
      .then((userProperties) => {
        userData = userProperties;
        userData.personal = { lastname: userProperties.lastName };
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
        cy.login(userData.username, userData.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroupId);
  });

  it(
    'C430 Make sure user can checkout in a timely manner using any scannable ID (volaris)',
    { tags: ['extendedPath', 'volaris', 'C430'] },
    () => {
      // Step 1-2: Enter the patron barcode and verify user information is displayed
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, patronGroup);

      // Step 3-4: Scan item barcode and verify checkout completes within 2 seconds
      CheckOutActions.checkOutItemAndMeasureTime(itemData.barcode, 2000);

      // Verify item information is displayed after successful checkout
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
    },
  );
});
