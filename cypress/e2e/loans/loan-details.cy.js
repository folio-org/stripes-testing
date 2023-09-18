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
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import AppPaths from '../../support/fragments/app-paths';
import LoansPage from '../../support/fragments/loans/loansPage';
import {
  Button,
  including,
  Link,
  MultiColumnList,
  MultiColumnListCell,
} from '../../../interactors';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';

describe('Loan Details', () => {
  const instanceId = uuid();
  const holdingId = uuid();
  const itemId = uuid();
  let addedCirculationRule;
  const feeFineType = {};
  const ownerData = {};
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
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(
      'autotestCircLog',
      uuid(),
    ),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.RECALL],
    name: getTestEntityValue('recallForCL'),
    id: uuid(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        InventoryInstances.createLoanType({
          name: getTestEntityValue('typeForCL'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        InventoryInstances.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            id: instanceId,
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              id: holdingId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              id: itemId,
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

    UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner(uuid(), 'owner'))
      .then(({ id, desc }) => {
        ownerData.name = desc;
        ownerData.id = id;
      })
      .then(() => {
        UsersOwners.addServicePointsViaApi(ownerData, [testData.userServicePoint]);
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
      });

    cy.createTempUser(
      [
        permissions.uiUsersViewLoans.gui,
        permissions.requestsAll.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.inventoryAll.gui,
      ],
      patronGroup.name,
    )
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.userServicePoint.id, userData.userId);
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
    ManualCharges.deleteViaApi(feeFineType.id);
    UsersOwners.deleteViaApi(ownerData.id);
    ItemActions.deleteItemViaApi(itemId);
    InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userForRequest.userId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    InventoryInstances.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C561 Loan details: test links (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      LoansPage.createNewFeeFine(ownerData.name, feeFineType.name);
      // Click linked value for item title
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(Link(including(itemData.title)), 'Instance');

      // Click linked value for barcode
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(Link(including(itemData.barcode)), 'Item');

      // Click linked value for Loan policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(
        Link({ href: including('/settings/circulation/loan-policies') }),
        'Loan policies',
      );

      // Click on linked value for Fine incurred
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(
        Button({ className: including('feefineButton') }),
        'Fee/fine details',
      );

      // Add another fee/fine to loan and click linked value for Fine incurred
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      LoansPage.createNewFeeFine(ownerData.name, feeFineType.name);
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(
        Button({ className: including('feefineButton') }),
        'Fees/fines',
      );

      // Click on linked value for overdue policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(
        Link(including('Overdue fine policy')),
        'Overdue fine policies',
      );

      // Click on linked value for lost item policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(
        Link(including('Lost item fee policy')),
        'Lost item fee policies',
      );

      // Click on linked value for Request queue
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      cy.do(
        MultiColumnList()
          .find(MultiColumnListCell(including(itemData.barcode)))
          .click(),
      );
      LoansPage.verifyLinkRedirectsCorrectPage(Link('1'), 'Requests');
    },
  );
});
