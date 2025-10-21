import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Request notice triggers', { retries: { runMode: 1 } }, () => {
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
    const itemData = {
      barcode: generateItemBarcode(),
      title: `Instance ${getRandomPostfix()}`,
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
        category: NOTICE_CATEGORIES.request,
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
    const requestPolicyBody = {
      requestTypes: [REQUEST_TYPES.HOLD],
      name: getTestEntityValue('hold'),
      id: uuid(),
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
          cy.getBookMaterialType().then((materialTypes) => {
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
            itemData.holdingId = specialInstanceIds.holdingIds[0].id;
            itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
          });
        });
      RequestPolicy.createViaApi(requestPolicyBody);
      PatronGroups.createViaApi(patronGroup.name).then((res) => {
        patronGroup.id = res;
        cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name)
          .then((userProperties) => {
            testData.requestUser.userId = userProperties.userId;
            testData.requestUser.barcode = userProperties.barcode;
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
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      Requests.getRequestApi({ query: `(item.barcode=="${itemData.barcode}")` }).then(
        (requestResponse) => {
          if (requestResponse?.[0]?.id) {
            Requests.deleteRequestViaApi(requestResponse[0].id);
          }
        },
      );
      NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
      UserEdit.changeServicePointPreferenceViaApi(testData.checkOutUser.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.requestUser.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.checkOutUser.userId);
      Users.deleteViaApi(testData.requestUser.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      noticeTemplates.forEach((template) => {
        NoticePolicyTemplateApi.getViaApi({ query: `name=${template.name}` }).then((templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        });
      });
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(itemData.instanceId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C347873 Hold request + Request expiration triggers (volaris)',
      { tags: ['criticalPath', 'volaris', 'C347873'] },
      () => {
        noticeTemplates.forEach((template, index) => {
          NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
          NewNoticePolicyTemplate.checkAfterSaving(template);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        NewNoticePolicy.openTabCirculationPatronNoticePolicies();
        NewNoticePolicy.waitLoading();
        NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
        NewNoticePolicy.checkPolicyName(noticePolicy);
        cy.wait(5000);
        cy.getAdminToken();
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.noticePolicyId = noticePolicyRes[0].id;
          CirculationRules.addRuleViaApi(
            { m: testData.materialTypeId },
            { n: testData.noticePolicyId, r: requestPolicyBody.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });

        cy.login(testData.checkOutUser.username, testData.checkOutUser.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
        CheckOutActions.checkOutUser(testData.checkOutUser.barcode);
        CheckOutActions.checkOutItem(itemData.barcode);
        Checkout.verifyResultsInTheRow([itemData.barcode]);
        CheckOutActions.endCheckOutSession();
        cy.wait(5000);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        Requests.waitLoading();
        NewRequest.createNewRequest({
          itemBarcode: itemData.barcode,
          itemTitle: itemData.title,
          requesterBarcode: testData.requestUser.barcode,
          pickupServicePoint: testData.servicePoint.name,
          requestType: REQUEST_TYPES.HOLD,
        });
        NewRequest.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemModified(itemData.barcode);
        AwaitingPickupForARequest.unselectCheckboxPrintSlipModified();
        AwaitingPickupForARequest.closeModalModified();
        CheckInActions.verifyLastCheckInItem(itemData.barcode);
        CheckInActions.endCheckInSession();
      },
    );
  });
});
