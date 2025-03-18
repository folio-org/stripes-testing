import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  let servicePointId;
  let userData = {};

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
          (servicePoints) => {
            servicePointId = servicePoints[0].id;
          },
        );
        cy.getLocations({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          itemData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          itemData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          itemData.materialTypeId = res.id;
          itemData.materialTypeName = res.name;
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
              permanentLocationId: Cypress.env('locations')[0].id,
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
      })
      .then(() => {
        cy.createTempUser(
          [
            Permissions.circulationLogAll.gui,
            Permissions.checkinAll.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryViewInstances.gui,
          ],
          'staff',
          'patron',
          false,
        ).then((userProperties) => {
          userData = userProperties;

          UserEdit.addServicePointsViaApi([servicePointId], userData.userId, servicePointId);
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePointId]);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
  });

  it(
    'C360554 Verify that "-" shown if User does not have barcode (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris', 'C360554'] },
    () => {
      // Navigate to the "Check in" app and check in the Item (step 2)
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
      CheckInActions.checkInItem(itemData.barcode);
      ConfirmItemInModal.confirmInTransitModal();
      // The item is Checked in
      // Navigate to the "Circulation log" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      // Search for the checked in Item by "Item barcode" field => Click "Apply" button
      SearchPane.searchByItemBarcode(itemData.barcode);
      // Check the row with the Item checked in (step 3) status
      // In the "User barcode" column "-" is displayed
      SearchPane.checkUserData('User barcode', '-', 0);
      SearchPane.checkUserData('Circ action', 'Checked in', 0);
    },
  );
});
