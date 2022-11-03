import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../../../support/fragments/users/users';
import SearchPane from '../../../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy from '../../../../support/fragments/circulation/lost-item-fee-policy';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import Conditions from '../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../support/fragments/settings/users/limits';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';

function generateUniqueItemBarcodeWithShift(index = 0) {
  return (generateItemBarcode() - Math.round(getRandomPostfix()) + '').substring(index);
}

describe('Patron Block: Maximum outstanding fee/fine balance', () => {
  let originalCirculationRules;
  const checkedOutBlockMessage = 'You have reached maximum outstanding fee/fine balance as set by patron group';
  const patronGroup = {
    name: 'groupToPatronBlock' + getRandomPostfix(),
  };
  const userData = {
    personal: {},
  };
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotest fee/fine limit', uuid()),
  };
  const owner = {
    body: {
      owner: 'AutotestOwner' + getRandomPostfix(),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    },
    data: {},
  };
  // const overdueFinePolicyBody = defaultOverdueFinePolicy;
  // overdueFinePolicyBody.overdueFine = {
  //   quantity: 1,
  //   intervalId: 'minute',
  // };
  // overdueFinePolicyBody.maxOverdueFine = 100;
  const lostItemFeePolicyBody = {
    name: '1_lost' + getRandomPostfix(),
    itemAgedLostOverdue: {
      duration: 1,
      intervalId: 'Minutes',
    },
    patronBilledAfterAgedLost: {
      duration: 1,
      intervalId: 'Minutes',
    },
    chargeAmountItem: {
      chargeType: 'Set cost',
      amount: 50.0,
    },
    lostItemProcessingFee: 50.0,
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: true,
    lostItemChargeFeeFine: {
      duration: 1,
      intervalId: 'Hours',
    },
    returnedLostItemProcessingFee: true,
    lostItemReturned: 'Charge',
    id: '90933be3-fd2d-43b8-9af0-f24650e1ed3d',
  };
  const loanPolicyBody = {
    id: uuid(),
    name: `1_loan_${getRandomPostfix()}`,
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      period: {
        duration: 1,
        intervalId: 'Minutes',
      },
      profileId: 'Rolling',
    },
    renewable: true,
    renewalsPolicy: {
      unlimited: true,
      renewFromId: 'CURRENT_DUE_DATE',
    },
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach(function (item, index) {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
          testData.materialTypeName = res.name;
        });
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: item.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: 'Available' },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId = specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.holdingIds[0].itemIds;
          });
        });
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      });

    UsersOwners.createViaApi(owner.body).then((response) => {
      owner.data = response;
      PaymentMethods.createViaApi(response.id);
    });
    // OverdueFinePolicy.createApi(overdueFinePolicyBody);
    LostItemFeePolicy.createViaApi(lostItemFeePolicyBody).then((response) => {
      lostItemFeePolicyBody.id = response.id;
    });
    LoanPolicy.createApi(loanPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
    });
    CirculationRules.getViaApi().then((response) => {
      originalCirculationRules = response.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      // ruleProps.o = overdueFinePolicyBody.id;
      ruleProps.i = lostItemFeePolicyBody.id;
      CirculationRules.addRuleViaApi(originalCirculationRules, ruleProps, 't ', testData.loanTypeId);
    });

    cy.createTempUser(
      [
        permissions.uiUsersSettingsOwners.gui,
        permissions.uiUsersCreatePatronConditions.gui,
        permissions.uiUsersCreatePatronLimits.gui,
        permissions.checkinAll.gui,
        permissions.checkoutAll.gui,
        permissions.uiUsersView.gui,
      ],
      patronGroup.name
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.personal.lastname = userProperties.lastName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.userServicePoint.id, userData.userId, testData.userServicePoint.id);

        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: userData.barcode,
          });
        });

        UserLoans.getUserLoansIdApi(userData.userId).then((response) => {
          const resp = response.loans;
          cy.log(resp);
          resp.forEach(({ id }) => {
            UserLoans.declareLoanLostByApi({ servicePointId: testData.userServicePoint.id }, id);
          });
        });

        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    UsersOwners.deleteViaApi(owner.data.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    // OverdueFinePolicy.deleteApi(overdueFinePolicyBody.id);
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItem(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Conditions.resetConditionViaApi('cf7a0d5f-a327-4ca1-aa9e-dc55ec006b8a', 'Maximum outstanding fee/fine balance');
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    CirculationRules.deleteRuleViaApi(originalCirculationRules);
  });
  it(
    'C350655 Verify automated patron block "Maximum outstanding fee/fine balance" removed after lost item renewed (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(SettingsMenu.conditionsPath);
      Conditions.waitLoading();
      Conditions.select('Maximum outstanding fee/fine balance');
      Conditions.setConditionState(checkedOutBlockMessage);
      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup(patronGroup.name);
      Limits.setMaximumOutstandingFeeFineBalance('499.99');

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkIsPatronBlocked(checkedOutBlockMessage, 'Borrowing, Renewals, Requests');
      // cy.wait(100000);

      cy.visit(TopMenu.checkInPath);
      const itemForCheckIn = itemsData.itemsWithSeparateInstance[0];
      CheckInActions.checkInItemGui(itemForCheckIn.barcode);
      CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkPatronIsNotBlocked();
    }
  );
});
