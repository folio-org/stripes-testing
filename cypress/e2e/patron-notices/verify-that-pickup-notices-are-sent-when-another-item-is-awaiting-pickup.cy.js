import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
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

describe('Patron notices', () => {
  describe('Request notice triggers', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const noticeTemplate = createNoticeTemplate({
      category: NOTICE_CATEGORIES.request,
      name: 'Awaiting_pickup_template',
      noticeOptions: {
        action: 'Awaiting pickup',
      },
    });
    const noticePolicy = {
      name: getTestEntityValue('AwaitingPickup'),
      description: 'Created by autotest team',
    };
    const requestPolicyBody = {
      requestTypes: [REQUEST_TYPES.RECALL],
      name: getTestEntityValue('recall'),
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
          cy.createLoanType({
            name: getTestEntityValue('loanType'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
            testData.folioInstances = InventoryInstances.generateFolioInstances({
              itemsProperties: { permanentLoanType: { id: testData.loanTypeId } },
            });
          });
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

      RequestPolicy.createViaApi(requestPolicyBody);
      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiRequestsCreate.gui,
        Permissions.uiCirculationViewCreateEditDelete.gui,
        Permissions.tlrEdit.gui,
        Permissions.uiCirculationSettingsNoticePolicies.gui,
        Permissions.uiCirculationSettingsNoticeTemplates.gui,
        Permissions.uiUserEdit.gui,
        Permissions.circulationLogAll.gui,
        Permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
      ]).then((userAProp) => {
        testData.userA = userAProp;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.userA.userId,
          testData.servicePoint.id,
        );
        cy.createTempUser().then((userBProp) => {
          testData.userB = userBProp;
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.itemBarcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.userB.barcode,
          });
        });

        cy.login(testData.userA.username, testData.userA.password, {
          path: SettingsMenu.circulationPatronNoticeTemplatesPath,
          waiter: NewNoticePolicyTemplate.waitLoading,
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      Requests.getRequestApi({ query: `(item.barcode=="${testData.itemBarcode}")` }).then(
        (requestResponse) => {
          Requests.deleteRequestViaApi(requestResponse[0].id);
        },
      );
      NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
      UserEdit.changeServicePointPreferenceViaApi(testData.userA.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      cy.deleteLoanType(testData.loanTypeId);
      Locations.deleteViaApi(testData.defaultLocation);
      NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplate.name}` }).then(
        (templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        },
      );
    });

    it(
      'C400642 Verify that Pickup notices are sent when another item is Awaiting pickup (volaris)',
      { tags: ['extendedPath', 'volaris', 'C400642'] },
      () => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplate);
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplate);

        cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
        NewNoticePolicy.waitLoading();
        NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates: [noticeTemplate] });
        NewNoticePolicy.checkPolicyName(noticePolicy);

        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.noticePolicyId = noticePolicyRes[0].id;
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { n: testData.noticePolicyId, r: requestPolicyBody.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });

        cy.visit(TopMenu.requestsPath);
        NewRequest.createNewRequest({
          itemBarcode: testData.itemBarcode,
          itemTitle: testData.folioInstances.instanceTitle,
          requesterBarcode: testData.userA.barcode,
          pickupServicePoint: testData.servicePoint.name,
          requestType: REQUEST_TYPES.RECALL,
        });

        cy.visit(TopMenu.checkInPath);
        CheckInActions.checkInItemGui(testData.itemBarcode);
        AwaitingPickupForARequest.unselectCheckboxPrintSlip();
        AwaitingPickupForARequest.closeModal();
        CheckInActions.verifyLastCheckInItem(testData.itemBarcode);
        CheckInActions.endCheckInSession();

        cy.visit(TopMenu.circulationLogPath);
        cy.log(testData.itemBarcode);
        SearchPane.searchByItemBarcode(testData.itemBarcode);
        const searchResults = {
          userBarcode: testData.userA.barcode,
          itemBarcode: testData.itemBarcode,
          object: 'Notice',
          circAction: 'Send',
          servicePoint: testData.servicePoint.name,
          source: 'System',
          desc: `Template: ${noticeTemplate.name}. Triggering event: Available.`,
        };
        SearchPane.findResultRowIndexByContent(searchResults.desc).then((rowIndex) => {
          SearchPane.checkResultSearch(searchResults, rowIndex);
        });
      },
    );
  });
});
