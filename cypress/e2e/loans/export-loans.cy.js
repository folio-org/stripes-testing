import { Permissions } from '../../support/dictionary';
import AppPaths from '../../support/fragments/app-paths';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Loans from '../../support/fragments/loans/loansPage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';

describe('Loans', () => {
  const testData = {};
  const userData = {};
  const itemsData = {
    itemsWithSeparateInstance: InventoryInstances.generateFolioInstances({ count: 4 }),
  };

  before('Create user, open and closed loans', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          testData.servicepointId = servicePoints[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: itemsData.itemsWithSeparateInstance,
          location: { id: testData.locationId },
        });
      });
    cy.createTempUser([
      Permissions.checkinAll.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiInventoryViewInstances.gui,
    ])
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
        UserEdit.addServicePointViaApi(
          testData.servicepointId,
          userData.userId,
          testData.servicepointId,
        );
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item) => {
          item.barcodes.forEach((barcode) => {
            Checkout.checkoutItemViaApi({
              itemBarcode: barcode,
              servicePointId: testData.servicepointId,
              userBarcode: userData.barcode,
            });
          });
        });
        CheckInActions.checkinItemViaApi({
          servicePointId: testData.servicepointId,
          itemBarcode: itemsData.itemsWithSeparateInstance[0].barcodes[0],
        });
        CheckInActions.checkinItemViaApi({
          servicePointId: testData.servicepointId,
          itemBarcode: itemsData.itemsWithSeparateInstance[1].barcodes[0],
        });
        cy.waitForAuthRefresh(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
        });
      });
  });

  after('Delete New Service point, Item and User', () => {
    cy.getAdminToken();
    itemsData.itemsWithSeparateInstance.forEach((instance) => {
      InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint: { id: testData.servicepointId },
        shouldCheckIn: true,
      });
    });
    Users.deleteViaApi(userData.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it(
    'C721 Export patron*s loans to CSV (vega)',
    { tags: ['smoke', 'vega', 'shiftLeft', 'C721'] },
    () => {
      const fileNameMask = 'export*';

      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      Loans.exportLoansToCSV();
      FileManager.verifyFile(
        Loans.verifyExportFileName,
        fileNameMask,
        Loans.verifyContentOfExportFileName,
        [
          itemsData.itemsWithSeparateInstance[2].instanceId,
          itemsData.itemsWithSeparateInstance[3].instanceId,
          'checkedout',
          itemsData.itemsWithSeparateInstance[2].barcodes[0],
          itemsData.itemsWithSeparateInstance[3].barcodes[0],
          itemsData.itemsWithSeparateInstance[2].instanceTitle,
          itemsData.itemsWithSeparateInstance[3].instanceTitle,
          itemsData.itemsWithSeparateInstance[2].holdings[0].id,
          itemsData.itemsWithSeparateInstance[3].holdings[0].id,
        ],
      );
      FileManager.renameFile('export*', 'ExportOpenLoans.csv');
      cy.visit(AppPaths.getClosedLoansPath(userData.userId));
      Loans.exportLoansToCSV();
      FileManager.verifyFile(
        Loans.verifyExportFileName,
        fileNameMask,
        Loans.verifyContentOfExportFileName,
        [
          itemsData.itemsWithSeparateInstance[0].instanceId,
          itemsData.itemsWithSeparateInstance[1].instanceId,
          'checkedin',
          itemsData.itemsWithSeparateInstance[0].barcodes[0],
          itemsData.itemsWithSeparateInstance[1].barcodes[0],
          itemsData.itemsWithSeparateInstance[0].instanceTitle,
          itemsData.itemsWithSeparateInstance[1].instanceTitle,
          itemsData.itemsWithSeparateInstance[0].holdings[0].id,
          itemsData.itemsWithSeparateInstance[1].holdings[0].id,
        ],
      );
    },
  );
});
