import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import AppPaths from '../../support/fragments/app-paths';
import Loans from '../../support/fragments/loans/loansPage';
import FileManager from '../../support/utils/fileManager';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';

describe('Export Loans ', () => {
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

        cy.login(userData.username, userData.password);
      });
  });

  after('Delete New Service point, Item and User', () => {
    CheckInActions.checkinItemViaApi({
      servicePointId: testData.servicepointId,
      itemBarcode: itemsData.itemsWithSeparateInstance[2].barcodes[0],
    });
    CheckInActions.checkinItemViaApi({
      servicePointId: testData.servicepointId,
      itemBarcode: itemsData.itemsWithSeparateInstance[3].barcodes[0],
    });
    Users.deleteViaApi(userData.userId).then(() => itemsData.itemsWithSeparateInstance.forEach((item, index) => {
      item.itemIds.forEach((id) => cy.deleteItemViaApi(id));
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(
        itemsData.itemsWithSeparateInstance[index].instanceId,
      );
    }));
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it('C721 Export patron*s loans to CSV (vega)', { tags: [TestTypes.smoke, DevTeams.vega] }, () => {
    const fileNameMask = 'export*';
    cy.wait(10000);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.waitLoading();
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
        itemsData.itemsWithSeparateInstance[2].holdingId,
        itemsData.itemsWithSeparateInstance[3].holdingId,
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
        itemsData.itemsWithSeparateInstance[0].holdingId,
        itemsData.itemsWithSeparateInstance[1].holdingId,
      ],
    );
  });
});
