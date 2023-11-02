import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';

describe('Request notice triggers', () => {
  let addedCirculationRule;
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
          permissions.requestsAll.gui,
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
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
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
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.cancelRequest.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      },
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C347866 Page request + Cancel request triggers (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplates.pageRequest);
      NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.pageRequest);

      const dublicate = true;
      NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplates.cancelRequest, dublicate);
      NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.cancelRequest);

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
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

      CirculationRules.getViaApi().then((response) => {
        testData.baseRules = response.rulesAsText;
        testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.ruleProps.n = noticePolicyRes[0].id;
          testData.ruleProps.r = requestPolicyBody.id;
          addedCirculationRule =
            't ' +
            testData.loanTypeId +
            ': i ' +
            testData.ruleProps.i +
            ' l ' +
            testData.ruleProps.l +
            ' r ' +
            testData.ruleProps.r +
            ' o ' +
            testData.ruleProps.o +
            ' n ' +
            testData.ruleProps.n;
          CirculationRules.addRuleViaApi(
            testData.baseRules,
            testData.ruleProps,
            't ',
            testData.loanTypeId,
          );
        });
      });

      cy.visit(TopMenu.requestsPath);
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

      cy.visit(TopMenu.circulationLogPath);
      checkNoticeIsSent(
        searchResultsData(
          `Template: ${noticeTemplates.pageRequest.name}. Triggering event: Paging request.`,
        ),
      );

      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      Requests.findCreatedRequest(itemData.title);
      Requests.selectFirstRequest(itemData.title);
      Requests.cancelRequest();

      cy.visit(TopMenu.circulationLogPath);
      checkNoticeIsSent(
        searchResultsData(
          `Template: ${noticeTemplates.cancelRequest.name}. Triggering event: Request cancellation.`,
        ),
      );
    },
  );
});
