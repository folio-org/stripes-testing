import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import {
  ITEM_STATUS_NAMES,
  REQUEST_TYPES,
  REQUEST_LEVELS,
  FULFILMENT_PREFERENCES,
} from '../../support/constants';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import LoansPage from '../../support/fragments/loans/loansPage';

describe('Circulation log', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userData;
  let userForRequest;
  const itemData = {
    barcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceCircLog'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
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
    SearchPane.searchByItemBarcode(itemData.barcode);
    return SearchPane.findResultRowIndexByContent(testData.userServicePoint.name);
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
      SearchResults.clickOnCell(itemData.barcode, Number(rowIndex));
      ItemRecordView.waitLoading();
    });
  };

  before('Preconditions', () => {
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
          name: getTestEntityValue('typeForCL'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
        });
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    RequestPolicy.createViaApi(requestPolicyBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
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

    cy.createTempUser([permissions.circulationLogAll.gui], patronGroup.name)
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
        cy.createTempUser([permissions.requestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            userForRequest = userProperties;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userForRequest.userId,
              testData.userServicePoint.id,
            );
          },
        );
      });
  });

  beforeEach('Create Request', () => {
    Checkout.checkoutItemViaApi({
      id: uuid(),
      itemBarcode: itemData.barcode,
      loanDate: moment.utc().format(),
      servicePointId: testData.userServicePoint.id,
      userBarcode: userData.barcode,
    }).then((checkoutResponse) => {
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: itemData.instanceId,
        item: { barcode: itemData.barcode },
        itemId: checkoutResponse.itemId,
        pickupServicePointId: testData.userServicePoint.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.RECALL,
        requesterId: userForRequest.userId,
      }).then((request) => {
        testData.requestsId = request.body.id;
      });
    });
    cy.loginAsAdmin();
  });

  afterEach('Delete Request', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    Requests.deleteRequestViaApi(testData.requestsId);
  });

  after('Deleting created entities', () => {
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userForRequest.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(userForRequest.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C17004 Check the Actions button from filtering Circulation log by recall requested (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      checkActionsButton('Recall requested');
    },
  );
});
