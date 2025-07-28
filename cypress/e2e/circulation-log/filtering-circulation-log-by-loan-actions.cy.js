import moment from 'moment';
import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import LoansPage from '../../support/fragments/loans/loansPage';
import Requests from '../../support/fragments/requests/requests';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

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
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
    cy.wait(2000);
    SearchPane.waitLoading();
    SearchPane.resetResults();
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
        testData.itemId = testData.folioInstances[0].items[0].id;
        testData.instanceId = testData.folioInstances[0].instanceId;
        testData.holdingTypeId = testData.folioInstances[0].holdings[0].id;
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
        cy.createTempUser([permissions.uiRequestsAll.gui]).then((userProperties) => {
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
      { tags: ['criticalPath', 'volaris', 'C16995'] },
      () => {
        checkActionsButton('Checked out through override');
      },
    );

    it(
      'C16982 Filter Circulation log by Checked out through override (volaris)',
      { tags: ['criticalPath', 'volaris', 'C16982'] },
      () => {
        filterByAction({
          circAction: 'Checked out through override',
          desc: 'Checked out to proxy: no.',
        });
      },
    );

    it(
      'C45935 Check the Actions button from filtering Circulation log by renewed through override (volaris)',
      { tags: ['criticalPath', 'volaris', 'C45935'] },
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
      cy.getAdminToken();
    });

    after('Deleting circulation rule', () => {
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.getToken(userData.username, userData.password);
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
      { tags: ['criticalPath', 'volaris', 'C17006'] },
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
      { tags: ['criticalPathBroken', 'volaris', 'C17007'] },
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
      { tags: ['criticalPath', 'volaris', 'C17004'] },
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
      { tags: ['criticalPath', 'volaris', 'C17003'] },
      () => {
        filterByAction({
          circAction: 'Recall requested',
          desc: 'New due date',
        });
      },
    );
  });
});
