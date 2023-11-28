import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import LoansPage from '../../support/fragments/loans/loansPage';
import Requests from '../../support/fragments/requests/requests';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';

describe('Circulation log', () => {
  let userData;
  let userForRequest;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const nonLoanablePolicyBody = {
    id: uuid(),
    name: getTestEntityValue('nonLoanable'),
    loanable: false,
    renewable: false,
  };
  const loanablePolicyBody = {
    id: uuid(),
    name: getTestEntityValue('Loanable'),
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
      renewFromId: 'SYSTEM_DATE',
    },
  };
  const lostItemFeePolicyBody = {
    name: getTestEntityValue('minuteLost'),
    chargeAmountItem: {
      amount: '0.00',
      chargeType: 'actualCost',
    },
    lostItemProcessingFee: '0.00',
    chargeAmountItemPatron: false,
    chargeAmountItemSystem: false,
    returnedLostItemProcessingFee: false,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: '0.00',
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    itemAgedLostOverdue: {
      duration: 1,
      intervalId: 'Minutes',
    },
    patronBilledAfterAgedLost: {
      duration: 1,
      intervalId: 'Minutes',
    },
    lostItemChargeFeeFine: {
      duration: 1,
      intervalId: 'Days',
    },
    id: uuid(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.RECALL],
    name: getTestEntityValue('recallForCL'),
    id: uuid(),
  };
  const goToCircLogApp = (filterName) => {
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('loan', filterName);
    SearchPane.searchByItemBarcode(testData.itemBarcode);
    return SearchPane.findResultRowIndexByContent(filterName);
  };
  const checkActionsButton = (filterName) => {
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.chooseActionByRow(rowIndex, 'Loan details');
      LoansPage.waitLoading();
    });
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.chooseActionByRow(rowIndex, 'User details');
      Users.verifyFirstNameOnUserDetailsPane(userData.firstName);
    });
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.clickOnCell(testData.itemBarcode, Number(rowIndex));
      ItemRecordView.waitLoading();
    });
  };
  const filterByAction = (tableData) => {
    const searchResultsData = {
      userBarcode: userData.barcode,
      itemBarcode: testData.itemBarcode,
      object: 'Loan',
      circAction: tableData.circAction,
      source: tableData.source || testData.adminSourceRecord,
      desc: tableData.desc,
    };
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('loan', searchResultsData.circAction);
    SearchPane.findResultRowIndexByContent(searchResultsData.circAction).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
    SearchPane.resetResults();
    SearchPane.searchByItemBarcode(testData.itemBarcode);
    SearchPane.findResultRowIndexByContent(searchResultsData.circAction).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
  };

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.getAdminSourceRecord().then((record) => {
      testData.adminSourceRecord = record;
    });
    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.userServicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation)
      .then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      })
      .then(() => {
        testData.itemBarcode = testData.folioInstances[0].barcodes[0];
        testData.itemId = testData.folioInstances[0].itemIds[0];
        testData.instanceId = testData.folioInstances[0].instanceId;
        testData.holdingTypeId = testData.folioInstances[0].holdingId;
      });
    cy.createLoanType({
      name: getTestEntityValue('loan'),
    }).then((loanType) => {
      testData.loanTypeId = loanType.id;
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.itemBarcode}"`,
      }).then((res) => {
        res.permanentLoanType = { id: testData.loanTypeId };
        cy.updateItemViaApi(res);
      });
    });
    cy.createTempUser([permissions.circulationLogAll.gui, permissions.okapiTimersPatch.gui])
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        cy.createTempUser([permissions.requestsAll.gui]).then((userProperties) => {
          userForRequest = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userForRequest.userId,
            testData.userServicePoint.id,
          );
        });
      })
      .then(() => {
        cy.loginAsAdmin();
      });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userForRequest.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(userForRequest.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    cy.deleteLoanType(testData.loanTypeId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  describe('Non Loanable', () => {
    before('Creating circulation rule', () => {
      LoanPolicy.createViaApi(nonLoanablePolicyBody);
      CirculationRules.addRuleViaApi(
        { t: testData.loanTypeId },
        { l: nonLoanablePolicyBody.id },
      ).then((newRule) => {
        testData.addedRule = newRule;
      });
      Checkout.checkoutThroughOverrideViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: testData.userServicePoint.id,
        userBarcode: userData.barcode,
      });
    });

    after('Deleting circulation rule', () => {
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.deleteLoanPolicy(nonLoanablePolicyBody.id);
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    it(
      'C16995 Check the Actions button from filtering Circulation log by Checked out through override (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        checkActionsButton('Checked out through override');
      },
    );

    it(
      'C16982 Filter Circulation log by Checked out through override (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        filterByAction({
          circAction: 'Checked out through override',
          desc: 'Checked out to proxy: no.',
        });
      },
    );

    it(
      'C45935 Check the Actions button from filtering Circulation log by renewed through override (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        UserLoans.renewItemViaApi({
          id: uuid(),
          itemBarcode: testData.itemBarcode,
          userBarcode: userData.barcode,
          overrideBlocks: {
            comment: getTestEntityValue('override-message'),
            renewalDueDateRequiredBlock: { dueDate: moment().add(6, 'hours').format() },
          },
          servicePointId: testData.userServicePoint.id,
        });
        checkActionsButton('Renewed through override');
      },
    );
  });

  describe('Loanable', () => {
    before('Creating circulation rule', () => {
      LoanPolicy.createViaApi(loanablePolicyBody);
      RequestPolicy.createViaApi(requestPolicyBody);
      LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
      CirculationRules.addRuleViaApi(
        { t: testData.loanTypeId },
        { l: loanablePolicyBody.id, r: requestPolicyBody.id, i: lostItemFeePolicyBody.id },
      ).then((newRule) => {
        testData.addedRule = newRule;
      });
      Checkout.checkoutItemViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: testData.userServicePoint.id,
        userBarcode: userData.barcode,
      });
      cy.getToken(userData.username, userData.password);
      UserLoans.updateTimerForAgedToLost('minute');
      cy.getAdminToken();
    });

    after('Deleting circulation rule', () => {
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.getToken(userData.username, userData.password);
      UserLoans.updateTimerForAgedToLost('reset');
      cy.getAdminToken();
      cy.deleteLoanPolicy(loanablePolicyBody.id);
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.itemBarcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      Requests.deleteRequestViaApi(testData.requestsId);
    });

    it(
      'C17006 Check the Actions button from filtering Circulation log by renewed (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        UserLoans.renewItemViaApi({
          id: uuid(),
          itemBarcode: testData.itemBarcode,
          userBarcode: userData.barcode,
        });
        checkActionsButton('Renewed');
      },
    );

    it(
      'C17007 Filter circulation log by aged to lost (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
          const loanData = userLoans.loans[0];
          const newDueDate = new Date(loanData.loanDate);
          newDueDate.setDate(newDueDate.getDate() - 1);
          UserLoans.changeDueDateViaApi(
            {
              ...loanData,
              dueDate: newDueDate,
              action: 'dueDateChanged',
            },
            loanData.id,
          );
          cy.wait(60000);
          filterByAction({
            circAction: 'Aged to lost',
            source: 'System',
            desc: 'Additional information',
          });
        });
        CheckInActions.checkinItemViaApi({
          itemBarcode: testData.itemBarcode,
          servicePointId: testData.userServicePoint.id,
          checkInDate: new Date().toISOString(),
        });
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.itemBarcode,
          servicePointId: testData.userServicePoint.id,
          userBarcode: userData.barcode,
        });
      },
    );

    it(
      'C17004 Check the Actions button from filtering Circulation log by recall requested (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: testData.instanceId,
          item: { barcode: testData.itemBarcode },
          itemId: testData.itemId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.RECALL,
          requesterId: userForRequest.userId,
        }).then((request) => {
          testData.requestsId = request.body.id;
        });
        checkActionsButton('Recall requested');
      },
    );

    it(
      'C17003 Filter circulation log by recall requested (volaris)',
      { tags: [TestTypes.criticalPath, devTeams.volaris] },
      () => {
        filterByAction({
          circAction: 'Recall requested',
          desc: 'New due date',
        });
      },
    );
  });
});
