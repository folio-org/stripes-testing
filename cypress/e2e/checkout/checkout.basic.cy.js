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
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';

describe('Check out', () => {
  const patronGroup = getTestEntityValue('staff');
  const USER_NAME = 'username';
  const getPrefPatronIdentifier = (otherSettings) => otherSettings.body.circulationSettings[0]?.value?.prefPatronIdentifier || '';
  let shouldRemoveUserNameAfterTest = false;
  let userData = {};
  let patronGroupId = '';

  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('Instance'),
  };
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
          itemData.materialTypeName = res.name;
        });
        PatronGroups.createViaApi(patronGroup).then((patronGroupResponse) => {
          patronGroupId = patronGroupResponse;
        });
        // Fetching the current "Other settings" values.
        // Checking if "Patron id(s) for checkout scanning" is enabled by "Username".
        // Enabling it if not already enabled.
        OtherSettings.getOtherSettingsViaApi().then((otherSettingsResp) => {
          const prefPatronIdentifier = getPrefPatronIdentifier(otherSettingsResp);

          if (!prefPatronIdentifier.includes(USER_NAME)) {
            shouldRemoveUserNameAfterTest = true;
            const updatedValue = prefPatronIdentifier
              ? `${prefPatronIdentifier},${USER_NAME}`
              : USER_NAME;

            OtherSettings.setOtherSettingsViaApi({
              prefPatronIdentifier: updatedValue,
            });
          }
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

    cy.createTempUser(
      [
        permissions.uiCirculationSettingsOtherSettings.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersCreate.gui,
        permissions.inventoryAll.gui,
        permissions.checkoutCirculatingItems.gui,
      ],
      patronGroup,
    )
      .then((userProperties) => {
        userData = userProperties;
        userData.personal.lastname = userProperties.lastName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
        cy.waitForAuthRefresh(() => {
          cy.login(userData.personal.lastname, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
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
    // Fetching the current "Other settings" values.
    // Checking if "Patron id(s) for checkout scanning" is enabled by "Username".
    // Verifying that it was enabled earlier.
    // Ensuring that "Username" is not the only enabled value, since at least one value is required.
    // Disabling "Username" if appropriate.
    OtherSettings.getOtherSettingsViaApi().then((otherSettingsResp) => {
      const prefPatronIdentifier = getPrefPatronIdentifier(otherSettingsResp);

      if (
        shouldRemoveUserNameAfterTest &&
        prefPatronIdentifier.includes(USER_NAME) &&
        prefPatronIdentifier !== USER_NAME
      ) {
        const updatedValue = prefPatronIdentifier
          .split(',')
          .filter((id) => id !== USER_NAME)
          .join(',');

        OtherSettings.setOtherSettingsViaApi({
          prefPatronIdentifier: updatedValue,
        });
      }
    });
  });

  it(
    'C356772 An active user with barcode can Check out item (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C356772'] },
    () => {
      // without this waiter, the user will not be found by username
      cy.wait(4000);
      CheckOutActions.checkOutUser(userData.barcode, userData.username);
      CheckOutActions.checkUserInfo(userData, patronGroup);
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
    },
  );
});
