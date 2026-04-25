import moment from 'moment';
import uuid from 'uuid';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Requests from '../../support/fragments/requests/requests';
import NoticePolicyApi, {
  getDefaultNoticePolicy,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

const patronGroup = {
  name: getTestEntityValue('groupToTestNotices'),
};
let userData;
let borrowerData;

const testData = {
  folioInstances: InventoryInstances.generateFolioInstances(),
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  ruleProps: {},
};

const templateBody = {
  active: true,
  category: 'Loan',
  description: 'Template for C365625',
  id: uuid(),
  localizedTemplates: {
    en: {
      body: '<div>Test email body</div>',
      header: 'Test Subject',
    },
  },
  name: `AT_C365625_template_${getRandomPostfix()}`,
  outputFormats: ['text/html'],
  templateResolver: 'mustache',
};
const noticePolicy = getDefaultNoticePolicy({ templateId: templateBody.id });

const userOwnerBody = {
  id: uuid(),
  owner: getTestEntityValue('Owner_C365625'),
  servicePointOwner: [
    {
      value: testData.userServicePoint.id,
      label: testData.userServicePoint.name,
    },
  ],
};

describe('Circulation log', () => {
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
        testData.holdingId = testData.folioInstances[0].holdings[0].id;
        testData.instanceTitle = testData.folioInstances[0].instanceTitle;
      });
    cy.createLoanType({
      name: getTestEntityValue('loanType_C365625'),
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
    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
    });
    cy.createTempUser([permissions.circulationLogView.gui], patronGroup.name)
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        // Notice policy setup - must complete before checkout to trigger Notice "Send"
        NoticePolicyTemplateApi.createViaApi(templateBody).then(() => {
          NoticePolicyApi.createWithTemplateApi(noticePolicy);
        });
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((response) => {
          testData.noticePolicyId = response[0].id;
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { n: testData.noticePolicyId },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });
        // Create a separate borrower user for all circulation activities.
        // A UI checkout (not API-only) is required to create a patron session,
        // which FOLIO needs to produce a Notice "Send" entry instead of "Send error".
        cy.createTempUser([permissions.checkoutAll.gui])
          .then((borrower) => {
            borrowerData = borrower;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              borrowerData.userId,
              testData.userServicePoint.id,
            );
          })
          .then(() => {
            // Log in as borrower, scan patron barcode (creates patron session), then checkout
            cy.login(borrowerData.username, borrowerData.password, {
              path: TopMenu.checkOutPath,
              waiter: Checkout.waitLoading,
            });
            CheckOutActions.checkOutUser(borrowerData.barcode);
            CheckOutActions.checkOutItem(testData.itemBarcode);
            CheckOutActions.endCheckOutSession();
            cy.getAdminToken();
            // Check in item so it is available for a PAGE request
            CheckInActions.checkinItemViaApi({
              itemBarcode: testData.itemBarcode,
              servicePointId: testData.userServicePoint.id,
              checkInDate: new Date().toISOString(),
            });
            // Create a PAGE request to generate a Request "Created" entry
            Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: testData.holdingId,
              instanceId: testData.instanceId,
              item: { barcode: testData.itemBarcode },
              itemId: testData.itemId,
              pickupServicePointId: testData.userServicePoint.id,
              requestDate: new Date(),
              requestExpirationDate: new Date(new Date().getTime() + 86400000),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.PAGE,
              requesterId: borrowerData.userId,
            }).then((request) => {
              testData.requestId = request.body.id;
            });
            // Create fee/fine owner, charge type, and account to generate a Fee/fine "Billed" entry
            UsersOwners.createViaApi(userOwnerBody);
            ManualCharges.createViaApi({
              defaultAmount: '4',
              automatic: false,
              feeFineType: getTestEntityValue('Charge_C365625'),
              ownerId: userOwnerBody.id,
            }).then((chargeRes) => {
              testData.manualChargeId = chargeRes.id;
              testData.manualChargeName = chargeRes.feeFineType;
              NewFeeFine.createViaApi({
                id: uuid(),
                ownerId: userOwnerBody.id,
                feeFineId: testData.manualChargeId,
                amount: 4,
                feeFineType: testData.manualChargeName,
                feeFineOwner: userOwnerBody.owner,
                userId: borrowerData.userId,
                itemId: testData.itemId,
                barcode: testData.itemBarcode,
                title: testData.instanceTitle,
                createdAt: testData.userServicePoint.id,
                dateAction: moment.utc().format(),
                source: testData.adminSourceRecord,
              }).then((feeFineId) => {
                testData.feeFineId = feeFineId;
              });
            });
            cy.login(userData.username, userData.password, {
              path: TopMenu.circulationLogPath,
              waiter: SearchPane.waitLoading,
            });
          });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    if (testData.feeFineId) {
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    }
    Requests.deleteRequestViaApi(testData.requestId);
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
    NoticePolicyTemplateApi.getViaApi({ query: `name=${templateBody.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(borrowerData.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: false,
    });
    cy.deleteLoanType(testData.loanTypeId);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(borrowerData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C365625 Verify that users can select filters, but not the Actions menus with "Circulation log: View permission " (volaris)',
    { tags: ['criticalPath', 'volaris', 'C365625'] },
    () => {
      SearchPane.filterByLastWeek();
      SearchResults.checkTableWithoutLinks();
      SearchResults.checkTableWithoutColumns(['Action']);
      SearchPane.checkExportResultIsUnavailable();

      SearchPane.setFilterOptionFromAccordion('loan', 'Checked out');
      SearchPane.findResultRowIndexByContent('Loan').then((rowIndex) => {
        SearchPane.checkResultSearch({ object: 'Loan' }, rowIndex);
      });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      SearchPane.setFilterOptionFromAccordion('notice', 'Send');
      SearchPane.findResultRowIndexByContent('Notice').then((rowIndex) => {
        SearchPane.checkResultSearch({ object: 'Notice' }, rowIndex);
      });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      SearchPane.setFilterOptionFromAccordion('fee', 'Billed');
      SearchPane.findResultRowIndexByContent('Fee/fine').then((rowIndex) => {
        SearchPane.checkResultSearch({ object: 'Fee/fine' }, rowIndex);
      });
      SearchPane.checkExportResultIsUnavailable();
      SearchPane.resetResults();

      SearchPane.filterByLastWeek();
      SearchPane.setFilterOptionFromAccordion('request', 'Created');
      SearchPane.findResultRowIndexByContent('Request').then((rowIndex) => {
        SearchPane.checkResultSearch({ object: 'Request' }, rowIndex);
      });
      SearchPane.checkExportResultIsUnavailable();
    },
  );
});
