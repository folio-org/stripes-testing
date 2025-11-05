import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
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
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Request notice triggers', () => {
    const patronGroup = {
      name: 'groupToTestNotices' + getRandomPostfix(),
    };
    let userData;
    const itemData = {
      barcode: generateItemBarcode(),
      title: `Instance ${getRandomPostfix()}`,
    };
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      ruleProps: {},
    };
    const noticeTemplates = {
      pageRequest: createNoticeTemplate({
        name: 'Page_request',
        category: NOTICE_CATEGORIES.request,
      }),
      cancelRequest: createNoticeTemplate({
        name: 'Cancel_request',
        category: NOTICE_CATEGORIES.request,
      }),
    };
    const searchResultsData = (description) => {
      return {
        userBarcode: userData.barcode,
        itemBarcode: itemData.barcode,
        object: 'Notice',
        circAction: 'Send',
        // TODO: add check for date with format <C6/8/2022, 6:46 AM>
        servicePoint: testData.userServicePoint.name,
        source: 'System',
        desc: description,
      };
    };
    const checkNoticeIsSent = (checkParams) => {
      SearchPane.searchByUserBarcode(userData.barcode);
      SearchPane.findResultRowIndexByContent(checkParams.desc).then((rowIndex) => {
        SearchPane.checkResultSearch(checkParams, rowIndex);
      });
    };
    const noticePolicy = {
      name: getTestEntityValue('Overdue fine, returned'),
      description: 'Created by autotest team',
    };
    const requestPolicyBody = {
      requestTypes: [REQUEST_TYPES.PAGE],
      name: `page${getRandomPostfix()}`,
      id: uuid(),
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
            name: `type_${getRandomPostfix()}`,
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
          });
          cy.getDefaultMaterialType().then((materialTypes) => {
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
        cy.createTempUser(
          [
            permissions.circulationLogAll.gui,
            permissions.uiCirculationSettingsNoticeTemplates.gui,
            permissions.uiCirculationSettingsNoticePolicies.gui,
            permissions.uiRequestsAll.gui,
          ],
          patronGroup.name,
        )
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id,
            );

            cy.login(userData.username, userData.password, {
              path: SettingsMenu.circulationPatronNoticeTemplatesPath,
              waiter: NewNoticePolicyTemplate.waitLoading,
            });
          });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.pageRequest.name}` }).then(
        (templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        },
      );
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.cancelRequest.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      cy.deleteLoanType(testData.loanTypeId);
    });

    it(
      'C347866 Page request + Cancel request triggers (volaris)',
      { tags: ['criticalPath', 'volaris', 'C347866'] },
      () => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplates.pageRequest);
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.pageRequest);

        const duplicate = true;
        NewNoticePolicyTemplate.createPatronNoticeTemplate(
          noticeTemplates.cancelRequest,
          duplicate,
        );
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.cancelRequest);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        NewNoticePolicy.openTabCirculationPatronNoticePolicies();
        NewNoticePolicy.waitLoading();
        NewNoticePolicy.startAdding();
        NewNoticePolicy.checkInitialState();
        NewNoticePolicy.fillGeneralInformation(noticePolicy);
        NewNoticePolicy.addNotice({
          noticeName: 'Request',
          noticeId: 'request',
          templateName: noticeTemplates.pageRequest.name,
          format: 'Email',
          action: 'Page request',
        });
        NewNoticePolicy.addNotice(
          {
            noticeName: 'Request',
            noticeId: 'request',
            templateName: noticeTemplates.cancelRequest.name,
            format: 'Email',
            action: 'Cancel request',
          },
          1,
        );
        NewNoticePolicy.save();
        NewNoticePolicy.waitLoading();
        NewNoticePolicy.checkPolicyName(noticePolicy);

        cy.getAdminToken();
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.noticePolicyId = noticePolicyRes[0].id;
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { n: testData.noticePolicyId, r: requestPolicyBody.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });

        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
        Requests.waitLoading();
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enterItemInfo(itemData.barcode);
        NewRequest.verifyItemInformation([itemData.barcode, itemData.title]);

        NewRequest.enterRequesterInfoWithRequestType(
          {
            requesterBarcode: userData.barcode,
            pickupServicePoint: testData.userServicePoint.name,
          },
          REQUEST_TYPES.PAGE,
        );
        NewRequest.verifyRequestInformation(REQUEST_TYPES.HOLD);
        NewRequest.saveRequestAndClose();
        NewRequest.waitLoading();

        cy.wait(10000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        checkNoticeIsSent(
          searchResultsData(
            `Template: ${noticeTemplates.pageRequest.name}. Triggering event: Paging request.`,
          ),
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        Requests.waitLoading();
        Requests.findCreatedRequest(itemData.title);
        Requests.selectFirstRequest(itemData.title);
        Requests.cancelRequest();

        cy.wait(10000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        checkNoticeIsSent(
          searchResultsData(
            `Template: ${noticeTemplates.cancelRequest.name}. Triggering event: Request cancellation.`,
          ),
        );
      },
    );
  });
});
