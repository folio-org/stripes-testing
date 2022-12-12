import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import generateUniqueItemBarcodeWithShift from '../../../../support/utils/generateUniqueItemBarcodeWithShift';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../../../support/fragments/users/users';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import Conditions from '../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../support/fragments/settings/users/limits';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import LostItemFeePolicy from '../../../../support/fragments/circulation/lost-item-fee-policy';
import UsersCard from '../../../../support/fragments/users/usersCard';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import Renewals from '../../../../support/fragments/loans/renewals';
import OverrideAndRenewModal from '../../../../support/fragments/users/loans/overrideAndRenewModal';
import RenewConfirmationModal from '../../../../support/fragments/users/loans/renewConfirmationModal';

describe('Patron Block: Maximum number of lost items', () => {
  let originalCirculationRules;
  const renewComment = `AutotestText${getRandomPostfix()}`;
  const blockMessage = 'You have reached maximum number of lost items as set by patron group';
  const patronGroup = {
    name: 'groupToPatronBlock' + getRandomPostfix(),
  };
  const userData = {};
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: `InstanceForDeclareLost ${getRandomPostfix()}` },
      { instanceTitle: `InstanceForDeclareLost ${getRandomPostfix()}` },
      { instanceTitle: `InstanceForDeclareLost ${getRandomPostfix()}` },
      { instanceTitle: `InstanceForAgedToLost ${getRandomPostfix()}` },
      { instanceTitle: `InstanceForAgedToLost ${getRandomPostfix()}` },
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotest lost items limit', uuid()),
  };
  const ownerBody = {
    owner: 'AutotestOwner' + getRandomPostfix(),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
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
      chargeType: 'anotherCost',
      amount: '100.00',
    },
    lostItemProcessingFee: '25.00',
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: true,
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks',
    },
    returnedLostItemProcessingFee: false,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: '0.00',
    replacementAllowed: false,
    feesFinesShallRefunded: {
      duration: 6,
      intervalId: 'Months',
    },
    lostItemReturned: 'Charge',
    id: uuid(),
  };
  const loanPolicyBody = {
    id: uuid(),
    name: `1_minute_${getRandomPostfix()}`,
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
      unlimited: false,
      numberAllowed: 2,
      renewFromId: 'SYSTEM_DATE',
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
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
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

    UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
      testData.ownerId = ownerResponse.id;
      PaymentMethods.createViaApi(testData.ownerId).then((paymentMethod) => {
        testData.paymentMethodId = paymentMethod.id;
      });
    });
    LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
    LoanPolicy.createViaApi(loanPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      ruleProps.i = lostItemFeePolicyBody.id;
      CirculationRules.addRuleViaApi(originalCirculationRules, ruleProps, 't ', testData.loanTypeId);
    });

    cy.createTempUser(
      [
        permissions.uiUsersSettingsOwners.gui,
        permissions.loansAll.gui,
        permissions.overridePatronBlock.gui,
        permissions.loansRenewOverride.gui,
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersCreatePatronConditions.gui,
        permissions.uiUsersCreatePatronLimits.gui,
        permissions.checkinAll.gui,
        permissions.checkoutAll.gui,
        permissions.uiUsersView.gui,
        permissions.okapiTimersPatch.gui,
      ],
      patronGroup.name
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        UserEdit.addServicePointViaApi(testData.userServicePoint.id, userData.userId, testData.userServicePoint.id);
        cy.getToken(userData.username, userData.password);
        UserLoans.updateTimerForAgedToLost('minute');
        cy.getAdminToken();
      })
      .then(() => {
        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: userData.barcode,
          });
        });

        UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
          const loansData = userLoans.loans;
          loansData.forEach(({ id, item }) => {
            if (item.title.includes('InstanceForDeclareLost')) {
              UserLoans.declareLoanLostViaApi({
                servicePointId: testData.userServicePoint.id,
                declaredLostDateTime: moment.utc().format(),
              }, id);
            }
          });
        });

        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    cy.getToken(userData.username, userData.password);
    UserLoans.updateTimerForAgedToLost('reset');
    cy.getAdminToken();
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      feesFinesData.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    cy.get('@items').each((item, index) => {
      cy.deleteItem(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(testData.ownerId);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
    CirculationRules.deleteRuleViaApi(originalCirculationRules);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Conditions.resetConditionViaApi('72b67965-5b73-4840-bc0b-be8f3f6e047e', 'Maximum number of lost items');
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
  });
  it(
    'C350653 Verify automated patron block "Maximum number of lost items" removed after lost item renewed (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(SettingsMenu.conditionsPath);
      Conditions.waitLoading();
      Conditions.select('Maximum number of lost items');
      Conditions.setConditionState(blockMessage);
      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup(patronGroup.name);
      Limits.setLimit('Maximum number of lost items', '4');
      // needed for the "Lost Item Fee Policy" so items can get "aged to lost" status
      cy.wait(230000);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.waitLoading();
      Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

      const itemForRenew = itemsData.itemsWithSeparateInstance[Math.floor(Math.random() * 5)];
      UsersCard.openLoans();
      UsersCard.showOpenedLoans();
      UserLoans.openLoan(itemForRenew.barcode);
      UserLoans.renewItem(itemForRenew.barcode, true);
      Renewals.renewBlockedPatron(renewComment);
      RenewConfirmationModal.confirmRenewOverrideItem();
      OverrideAndRenewModal.confirmOverrideItem();

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkPatronIsNotBlocked(userData.userId);
    }
  );
});
