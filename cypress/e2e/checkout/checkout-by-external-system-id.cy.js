import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Check out', () => {
  const EXTERNAL_SYSTEM_ID = 'externalSystemId';
  let shouldRemoveExternalSystemIdAfterTest = false;
  let servicePoint;
  let staffUser = {};

  const patronUser = Users.generateUserModel();
  patronUser.externalSystemId = `AT_C429_ExternalId_${getRandomPostfix()}`;

  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('AT_C429_Instance'),
  };

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
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          itemData.mainLibraryLocationId = res.id;
        });
        // Precondition #1: ensure "External System ID" is enabled in Other settings
        OtherSettings.enablePrefPatronIdentifierIfNeeded(EXTERNAL_SYSTEM_ID, (value) => {
          shouldRemoveExternalSystemIdAfterTest = value;
        });
      })
      .then(() => {
        // Precondition #3: create an item in "Available" status
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: itemData.holdingTypeId,
              permanentLocationId: itemData.mainLibraryLocationId,
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
        }).then((specialInstanceIds) => {
          itemData.testInstanceIds = specialInstanceIds;
        });

        // Precondition #2: create a patron user with barcode and externalSystemId
        cy.createTempUserParameterized(patronUser, [], { userType: 'patron' }).then(
          (userProperties) => {
            Object.assign(patronUser, userProperties);
          },
        );

        // Precondition #4: create staff user with "Check out: All permissions"
        cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
          staffUser = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, staffUser.userId, servicePoint.id);
        });
      })
      .then(() => {
        cy.login(staffUser.username, staffUser.password, {
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
    Users.deleteViaApi(patronUser.userId);
    Users.deleteViaApi(staffUser.userId);
    OtherSettings.disablePrefPatronIdentifierIfNeeded(
      EXTERNAL_SYSTEM_ID,
      shouldRemoveExternalSystemIdAfterTest,
    );
  });

  it(
    'C429 Make sure that user can checkout a book using External system ID (vega)',
    { tags: ['extendedPath', 'vega', 'C429'] },
    () => {
      // #1 Open "Check out" app
      CheckOutActions.checkIsInterfacesOpened();

      // #2 Enter the External system ID of patron user into "Scan patron card" field and click "Enter"
      CheckOutActions.checkOutUser(patronUser.barcode, patronUser.externalSystemId);
      CheckOutActions.checkPatronInformation();

      // #3 Enter the item barcode in the right column and click "Enter"
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.verifyItemCheckedOut(itemData.barcode);

      // #4 Click "End session"
      CheckOutActions.endCheckOutSession();
    },
  );
});
