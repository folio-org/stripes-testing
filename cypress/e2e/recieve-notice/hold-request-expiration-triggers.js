/* eslint-disable no-unused-vars */
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import { REQUEST_TYPES } from '../../support/constants';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import NewRequest from '../../support/fragments/requests/newRequest';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import Requests from '../../support/fragments/requests/requests';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Hold request expiration triggers', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    adminSourceRecord: {},
    ruleProps: {},
    checkOutUser: {},
    requestUser: {},
  };
  const patronGroup = {
    name: getTestEntityValue('groupToTestNotices'),
  };
  const instanceData = {
    itemBarcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceNotice'),
  };
  const noticeTemplates = [
    createNoticeTemplate({
      category: NOTICE_CATEGORIES.request,
      name: 'Hold_request_template',
      noticeOptions: {
        action: 'Hold request',
      },
    }),
    createNoticeTemplate({
      category: NOTICE_CATEGORIES.request,
      name: 'Request_expiration_before_once_template',
      noticeOptions: {
        action: 'Request expiration',
        send: 'Before',
        sendBy: {
          duration: '2',
          interval: 'Hour(s)',
        },
        frequency: 'One Time',
      },
    }),
    createNoticeTemplate({
      category: NOTICE_CATEGORIES.request,
      name: 'Request_expiration_before_recurring_template',
      noticeOptions: {
        action: 'Request expiration',
        send: 'Before',
        sendBy: {
          duration: '2',
          interval: 'Hour(s)',
        },
        frequency: 'Recurring',
        sendEvery: {
          duration: '30',
          interval: 'Minute(s)',
        },
      },
    }),
    createNoticeTemplate({
      name: 'Request_expiration_upon_at_template',
      noticeOptions: {
        action: 'Request expiration',
        send: 'Upon/At',
      },
    }),
  ];
  const noticePolicy = {
    name: getTestEntityValue('HoldRequest_RequestExpiration'),
    description: 'Created by autotest team',
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;
        // cy.createLoanType({
        //   name: getTestEntityValue('loanType'),
        // }).then((loanType) => {
        //   testData.loanTypeId = loanType.id;
        //   testData.folioInstances = InventoryInstances.generateFolioInstances({
        //     itemsProperties: { permanentLoanType: { id: testData.loanTypeId } },
        //   });
        // });
      })
      .then(() => {
        Locations.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      })
      .then(() => {
        testData.itemBarcode = testData.folioInstances[0].barcodes[0];
      });

    // RequestPolicy.createViaApi(requestPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
      cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name)
        .then((userProperties) => {
          testData.requestUser.userId = userProperties.userId;
          testData.requestUser.barcode = userProperties.barcode;
          testData.requestUser.personal.lastname = userProperties.lastName;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.requestUser.userId);
        });
      cy.createTempUser(
        [
          Permissions.uiRequestsAll.gui,
          Permissions.circulationLogAll.gui,
          Permissions.uiCirculationSettingsNoticeTemplates.gui,
          Permissions.uiCirculationSettingsNoticePolicies.gui,
          Permissions.checkoutAll.gui,
          Permissions.checkinAll.gui,
        ],
        patronGroup.name,
      )
        .then((userProperties) => {
          testData.checkOutUser = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.checkOutUser.userId);
          cy.login(testData.checkOutUser.username, testData.checkOutUser.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    // CirculationRules.deleteRuleViaApi(testData.addedRule);
    // Requests.getRequestApi({ query: `(item.barcode=="${testData.itemBarcode}")` }).then(
    //   (requestResponse) => {
    //     Requests.deleteRequestViaApi(requestResponse[0].id);
    //   },
    // );
    // NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
    // UserEdit.changeServicePointPreferenceViaApi(testData.userA.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.userA.userId);
    Users.deleteViaApi(testData.userB.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    testData.folioInstances.forEach((instance) => {
      InventoryInstances.deleteInstanceViaApi({ instance });
    });
    // InventoryInstances.deleteInstanceViaApi({
    //   instance: testData.folioInstances[0],
    //   servicePoint: testData.servicePoint,
    //   shouldCheckIn: true,
    // });
    // RequestPolicy.deleteViaApi(requestPolicyBody.id);
    Locations.deleteViaApi(testData.defaultLocation);
    noticeTemplates.forEach((template) => {
      NoticePolicyTemplateApi.getViaApi({ query: `name=${template.name}` }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
    });
  });

  it(
    'C347873 Hold request + Request expiration triggers (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      noticeTemplates.forEach((template, index) => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
        NewNoticePolicyTemplate.checkAfterSaving(template);
      });

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();

      NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
      NewNoticePolicy.checkPolicyName(noticePolicy);
      cy.wait(5000);
      // cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
      //   testData.noticePolicyId = noticePolicyRes[0].id;
      //   CirculationRules.addRuleViaApi(
      //     { t: testData.loanTypeId },
      //     { n: testData.noticePolicyId, r: requestPolicyBody.id },
      //   ).then((newRule) => {
      //     testData.addedRule = newRule;
      //   });
      // });

      // cy.visit(TopMenu.requestsPath);
      // NewRequest.createNewRequest({
      //   itemBarcode: testData.itemBarcode,
      //   itemTitle: testData.folioInstances.instanceTitle,
      //   requesterBarcode: testData.userA.barcode,
      //   pickupServicePoint: testData.servicePoint.name,
      //   requestType: REQUEST_TYPES.RECALL,
      // });

      // cy.visit(TopMenu.checkInPath);
      // CheckInActions.checkInItemGui(testData.itemBarcode);
      // AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      // AwaitingPickupForARequest.closeModal();
      // CheckInActions.verifyLastCheckInItem(testData.itemBarcode);
      // CheckInActions.endCheckInSession();

      // cy.visit(TopMenu.circulationLogPath);
      // cy.log(testData.itemBarcode);
      // SearchPane.searchByItemBarcode(testData.itemBarcode);
      // const searchResults = {
      //   userBarcode: testData.userA.barcode,
      //   itemBarcode: testData.itemBarcode,
      //   object: 'Notice',
      //   circAction: 'Send',
      //   servicePoint: testData.servicePoint.name,
      //   source: 'System',
      //   desc: `Template: ${noticeTemplate.name}. Triggering event: Available.`,
      // };
      // SearchPane.findResultRowIndexByContent(searchResults.desc).then((rowIndex) => {
      //   SearchPane.checkResultSearch(searchResults, rowIndex);
      // });
    },
  );
});
