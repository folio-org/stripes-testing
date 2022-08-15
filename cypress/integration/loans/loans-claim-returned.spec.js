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
import AppPaths from '../../support/fragments/app-paths';
import Loans from '../../support/fragments/loans/loansPage';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';

import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';



describe('Loans ', () => {
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotest loans claim returned', uuid());
  const testData = {};
  const userData = {};
  const ownerData = {};
  const itemStatuses = {
    checkedOut: 'CheckedOut'
  };
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

  const openOpenedUserLoans = ({ username }) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(username);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
  };

  const openLoanWithParametrizedItemStatus = (itemStatus) => {
    openOpenedUserLoans(this.userData);
    UserLoans.selectLoan(itemStatus);
    // cy.do(rowInList.find(HTML(including(barcode))).click());
  };

  before('Create user, open and closed loans', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialTypeId = res.id; });
      UsersOwners.createViaApi({ ...UsersOwners.getDefaultNewOwner(uuid(), 'owner'), servicePointOwner: [{ value: servicePoint.id, label: servicePoint.name }] }).then(({ id, ownerName }) => {
        ownerData.name = ownerName;
        ownerData.id = id;
      });
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      Location.createViaApi(defaultLocation);
    }).then(() => {
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        InventoryInstances.createFolioInstanceViaApi({ instance: {
          instanceTypeId: testData.instanceTypeId,
          title: item.instanceTitle,
        },
        holdings: [{
          holdingsTypeId: testData.holdingTypeId,
          permanentLocationId: defaultLocation.id,
        }],
        items:[{
          barcode: item.barcode,
          status:  { name: 'Available' },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
        }] }).then(specialInstanceIds => {
          itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
          itemsData.itemsWithSeparateInstance[index].holdingId = specialInstanceIds.holdingIds[0].id;
          itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    });
    cy.createTempUser([permissions.checkinAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersView.gui,
      permissions.uiUsersDeclareItemLost,
      permissions.uiUsersLoansClaimReturned,
      permissions.uiInventoryViewInstances.gui
    ])
      .then(userProperties => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
        UserEdit.addServicePointViaApi(servicePoint.id,
          userData.userId, servicePoint.id);
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: itemsData.itemsWithSeparateInstance[index].barcode,
            loanDate: moment.utc().format(),
            servicePointId: servicePoint.id,
            userBarcode: userData.barcode,
          });
          if (index % 2 === 0) {
            cy.loginAsAdmin().then(() => {
              openOpenedUserLoans(userData);
              UserLoans.declareLoanLost();
              ConfirmItemStatusModal.confirmItemStatus();
            // ItemVeiw.verifyItemStatus('DeclaredToLost');
            });
          }
        });
      });
  });

  // after('Delete New Service point, Item and User', () => {
  //   UsersOwners.deleteViaApi(ownerData.id);
  //   UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);

  //   ServicePoints.deleteViaApi(servicePoint.id);
  //   Users.deleteViaApi(userData.userId)
  //   // .then(
  //   //   () => itemsData.itemsWithSeparateInstance.forEach(
  //   //     (item, index) => {
  //   //       cy.deleteItem(item.itemId);
  //   //       cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
  //   //       InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
  //   //     }
  //   //   )
  //   // );
  //   Location.deleteViaApiIncludingInstitutionCampusLibrary(
  //     defaultLocation.institutionId,
  //     defaultLocation.campusId,
  //     defaultLocation.libraryId,
  //     defaultLocation.id
  //   );
  // });

  it('C10959 Loans: Claim returned (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
    cy.login(userData.username, userData.password).then(() => {
      openOpenedUserLoans(userData);
      openLoanWithParametrizedItemStatus(itemStatuses.checkedOut);
      Loans.claimReturnedAndCancel();
      Loans.claimReturnedAndConfirm();
      openLoanWithParametrizedItemStatus(itemStatuses.checkedOut);
      Loans.claimReturnedAndCancel();
      Loans.claimReturnedAndConfirm();
    });
  });
});
