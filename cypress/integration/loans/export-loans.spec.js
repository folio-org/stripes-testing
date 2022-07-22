import moment from 'moment';
import uuid from 'uuid';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckOutActions from '../../support/fragments/checkout/checkout';
import AppPaths from '../../support/fragments/app-paths';
import Loans from '../../support/fragments/loans/loansPage';
import FileManager from '../../support/utils/fileManager';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

import Users from '../../support/fragments/users/users';

describe('Export Loans ', () => {
  const testData = {};
  const userData = {};
  const itemsData = {
    itemsWithSeparateInstance: [{
      barcode: generateItemBarcode() - Math.round(getRandomPostfix()),
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      barcode: generateItemBarcode() - Math.round(getRandomPostfix()),
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      barcode: generateItemBarcode() - Math.round(getRandomPostfix()),
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      barcode: generateItemBarcode() - Math.round(getRandomPostfix()),
      instanceTitle: `Instance ${getRandomPostfix()}`,
    }]
  };

  before('Create user, open and closed loans', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      cy.getLocations({ limit: 1 }).then((res) => { testData.locationId = res.id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialTypeId = res.id; });
      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => { testData.servicepointId = servicePoints[0].id; });
    }).then(() => {
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        InventoryInstances.createFolioInstanceViaApi({ instance: {
          instanceTypeId: testData.instanceTypeId,
          title: item.instanceTitle,
        },
        holdings: [{
          holdingsTypeId: testData.holdingTypeId,
          permanentLocationId: testData.locationId,
        }],
        items:[{
          barcode: item.barcode,
          status:  { name: 'Available' },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
        }] })
          .then(specialInstanceIds => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId = specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.holdingIds[0].itemIds;
          });
      });
    });
    cy.createTempUser([permissions.checkinAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersView.gui,
      permissions.uiInventoryViewInstances.gui])
      .then(userProperties => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
        UserEdit.addServicePointViaApi(testData.servicepointId,
          userData.userId, testData.servicepointId);
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach(item => {
          CheckOutActions.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.servicepointId,
            userBarcode: userData.barcode,
          });
        });
        CheckInActions.checkinItemViaApi({
          checkInDate: moment.utc().format(),
          servicePointId: testData.servicepointId,
          itemBarcode: itemsData.itemsWithSeparateInstance[0].barcode,
        });
        CheckInActions.checkinItemViaApi({
          checkInDate: moment.utc().format(),
          servicePointId: testData.servicepointId,
          itemBarcode: itemsData.itemsWithSeparateInstance[1].barcode,
        });

        cy.login(userData.username, userData.password, { path: TopMenu.checkInPath, waiter: CheckInActions.waitLoading });
      });
  });

  after('Delete New Service point, Item and User', () => {
    CheckInActions.checkinItemViaApi({
      checkInDate: moment.utc().format(),
      servicePointId: testData.servicepointId,
      itemBarcode: itemsData.itemsWithSeparateInstance[2].barcode,
    });
    CheckInActions.checkinItemViaApi({
      checkInDate: moment.utc().format(),
      servicePointId: testData.servicepointId,
      itemBarcode: itemsData.itemsWithSeparateInstance[3].barcode,
    });
    Users.deleteViaApi(userData.userId).then(
      () => itemsData.itemsWithSeparateInstance.forEach(
        (item, index) => {
          cy.deleteItem(item.itemId);
          cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
          InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
        }
      )
    );
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it('C721 Export patron*s loans to CSV (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
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
        itemsData.itemsWithSeparateInstance[2].barcode,
        itemsData.itemsWithSeparateInstance[3].barcode,
        itemsData.itemsWithSeparateInstance[2].instanceTitle,
        itemsData.itemsWithSeparateInstance[3].instanceTitle,
        itemsData.itemsWithSeparateInstance[2].holdingId,
        itemsData.itemsWithSeparateInstance[3].holdingId
      ]
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
        itemsData.itemsWithSeparateInstance[0].barcode,
        itemsData.itemsWithSeparateInstance[1].barcode,
        itemsData.itemsWithSeparateInstance[0].instanceTitle,
        itemsData.itemsWithSeparateInstance[1].instanceTitle,
        itemsData.itemsWithSeparateInstance[0].holdingId,
        itemsData.itemsWithSeparateInstance[1].holdingId
      ]
    );
  });
});
