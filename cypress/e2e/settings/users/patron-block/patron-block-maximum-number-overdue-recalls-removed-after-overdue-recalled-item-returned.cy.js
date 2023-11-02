import uuid from 'uuid';
import moment from 'moment';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../../../support/constants';
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
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import Conditions from '../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../support/fragments/settings/users/limits';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import Requests from '../../../../support/fragments/requests/requests';
import RequestPolicy from '../../../../support/fragments/circulation/request-policy';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';

describe('Patron Block: Maximum number of overdue recalls', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  const checkedOutBlockMessage = `You have reached maximum number of overdue recalls as set by patron group${getRandomPostfix()}`;
  const patronGroup = {
    name: 'groupToPatronBlock' + getRandomPostfix(),
  };
  const userData = {};
  const recallUserData = {};
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
    requestsId: [],
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
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
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.RECALL],
    name: `recall_${getRandomPostfix()}`,
    id: uuid(),
  };

  const findPatron = () => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByKeywords(userData.barcode);
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach((item, index) => {
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
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId =
              specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId =
              specialInstanceIds.holdingIds[0].itemIds;
          });
        });
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      });

    LoanPolicy.createViaApi(loanPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    RequestPolicy.createViaApi(requestPolicyBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      ruleProps.r = requestPolicyBody.id;
      addedCirculationRule =
        't ' +
        testData.loanTypeId +
        ': i ' +
        ruleProps.i +
        ' l ' +
        ruleProps.l +
        ' r ' +
        ruleProps.r +
        ' o ' +
        ruleProps.o +
        ' n ' +
        ruleProps.n;
      CirculationRules.addRuleViaApi(
        originalCirculationRules,
        ruleProps,
        't ',
        testData.loanTypeId,
      );
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
      patronGroup.name,
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );

        cy.createTempUser([permissions.requestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            recallUserData.username = userProperties.username;
            recallUserData.userId = userProperties.userId;
            recallUserData.barcode = userProperties.barcode;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              recallUserData.userId,
              testData.userServicePoint.id,
            );
          },
        );

        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: userData.barcode,
          }).then((checkoutResponse) => {
            Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: testData.holdingTypeId,
              instanceId: item.instanceId,
              item: { barcode: item.barcode },
              itemId: checkoutResponse.itemId,
              pickupServicePointId: testData.userServicePoint.id,
              requestDate: new Date(),
              requestExpirationDate: new Date(new Date().getTime() + 86400000),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.RECALL,
              requesterId: recallUserData.userId,
            }).then((request) => {
              testData.requestsId.push(request.body.id);
            });
          });
        });

        UserLoans.changeDueDateForAllOpenPatronLoans(userData.userId, -1);

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
    cy.deleteLoanPolicy(loanPolicyBody.id);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(recallUserData.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.wrap(testData.requestsId).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(recallUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Conditions.resetConditionViaApi(
      'e5b45031-a202-4abb-917b-e1df9346fe2c',
      'Maximum number of overdue recalls',
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C350650 Verify automated patron block "Maximum number of overdue recalls" removed after overdue recalled item returned (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(SettingsMenu.conditionsPath);
      Conditions.waitLoading();
      Conditions.select('Maximum number of overdue recalls');
      Conditions.setConditionState(checkedOutBlockMessage);
      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup(patronGroup.name);
      Limits.setLimit('Maximum number of overdue recalls', '4');

      findPatron();
      UsersCard.waitLoading();
      Users.checkIsPatronBlocked(checkedOutBlockMessage, 'Borrowing, Renewals, Requests');

      cy.visit(TopMenu.checkInPath);
      const itemForCheckIn = itemsData.itemsWithSeparateInstance[0];
      CheckInActions.checkInItemGui(itemForCheckIn.barcode);
      CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

      findPatron();
      Users.checkPatronIsNotBlocked(userData.userId);
    },
  );
});
