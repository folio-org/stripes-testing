import uuid from 'uuid';
import { APPLICATION_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import Checkout from '../../support/fragments/checkout/checkout';
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
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Request notice triggers', () => {
    const patronGroup = {
      name: getTestEntityValue('groupToTestNotices'),
    };
    let userForRequest;
    const userForCheckOut = {
      personal: {
        lastname: null,
      },
    };
    const instanceData = {
      itemBarcode: generateItemBarcode(),
      title: getTestEntityValue('InstanceNotice'),
    };
    const testData = {
      userServicePoint: {
        ...ServicePoints.getDefaultServicePointWithPickUpLocation(),
        holdShelfExpiryPeriod: { intervalId: 'Minutes', duration: '1' },
      },
      ruleProps: {},
    };
    const noticeTemplates = {
      itemRecaled: { ...createNoticeTemplate('Item_recalled_template') },
      recallRequest: createNoticeTemplate({
        name: 'Recall_request_template',
        category: NOTICE_CATEGORIES.request,
      }),
      awaitingPickUp: createNoticeTemplate({
        name: 'Awaiting_pick_up_template',
        category: NOTICE_CATEGORIES.request,
      }),
      holdShelfBeforeOnce: createNoticeTemplate({
        name: 'Hold_shelf_expiration_before_once_template',
        category: NOTICE_CATEGORIES.request,
      }),
      holdShelfBeforeRecurring: createNoticeTemplate({
        name: 'Hold_shelf_expiration_before_recurring',
        category: NOTICE_CATEGORIES.request,
      }),
      holdShelfUponAt: createNoticeTemplate({
        name: 'Hold_shelf_expiration_upon_at',
        category: NOTICE_CATEGORIES.request,
      }),
    };
    const selectOptions = (template) => {
      const generalOptions = {
        noticeName: 'Request',
        noticeId: 'request',
        format: 'Email',
        templateName: template.name,
      };
      let finalOptions;

      switch (template.name) {
        case noticeTemplates.itemRecaled.name:
          finalOptions = {
            ...generalOptions,
            noticeName: 'Loan',
            noticeId: 'loan',
            action: 'Item recalled',
          };
          break;
        case noticeTemplates.recallRequest.name:
          finalOptions = {
            ...generalOptions,
            action: 'Recall request',
          };
          break;
        case noticeTemplates.awaitingPickUp.name:
          finalOptions = {
            ...generalOptions,
            action: 'Awaiting pickup',
          };
          break;
        case noticeTemplates.holdShelfBeforeOnce.name:
          finalOptions = {
            ...generalOptions,
            action: 'Hold shelf expiration',
            send: 'Before',
            sendBy: {
              duration: '1',
              interval: 'Minute(s)',
            },
            frequency: 'One Time',
          };
          break;
        case noticeTemplates.holdShelfBeforeRecurring.name:
          finalOptions = {
            ...generalOptions,
            action: 'Hold shelf expiration',
            send: 'Before',
            sendBy: {
              duration: '1',
              interval: 'Minute(s)',
            },
            frequency: 'Recurring',
            sendEvery: {
              duration: '1',
              interval: 'Minute(s)',
            },
          };
          break;
        case noticeTemplates.holdShelfUponAt.name:
          finalOptions = {
            ...generalOptions,
            action: 'Hold shelf expiration',
            send: 'Upon/At',
          };
          break;
        default:
          finalOptions = generalOptions;
      }
      return finalOptions;
    };
    const searchResultsData = (templateName) => {
      return {
        userBarcode: userForRequest.barcode,
        itemBarcode: instanceData.itemBarcode,
        object: 'Notice',
        circAction: 'Send',
        // TODO: add check for date with format <C6/8/2022, 6:46 AM>
        servicePoint: testData.userServicePoint.name,
        source: 'System',
        desc: `Template: ${templateName}. Triggering event: Hold expiration.`,
      };
    };
    const checkNoticeIsSent = (checkParams) => {
      SearchPane.searchByItemBarcode(instanceData.itemBarcode);
      SearchPane.findResultRowIndexByContent(checkParams.desc).then((rowIndex) => {
        SearchPane.scroll();
        SearchPane.checkResultSearch(checkParams, rowIndex);
      });
      SearchPane.resetFilters();
    };
    const noticePolicy = {
      name: getTestEntityValue('Overdue fine, returned'),
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
            name: getTestEntityValue('type'),
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
              title: instanceData.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: instanceData.itemBarcode,
                status: { name: 'Available' },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        });

      RequestPolicy.createViaApi(requestPolicyBody);
      PatronGroups.createViaApi(patronGroup.name).then((res) => {
        patronGroup.id = res;
        cy.createTempUser([permissions.checkoutAll.gui], patronGroup.name)
          .then((userProperties) => {
            userForCheckOut.userId = userProperties.userId;
            userForCheckOut.barcode = userProperties.barcode;
            userForCheckOut.personal.lastname = userProperties.lastName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userForCheckOut.userId,
              testData.userServicePoint.id,
            );
          });
        cy.createTempUser(
          [
            permissions.uiRequestsAll.gui,
            permissions.circulationLogAll.gui,
            permissions.uiCirculationSettingsNoticeTemplates.gui,
            permissions.uiCirculationSettingsNoticePolicies.gui,
            permissions.checkoutAll.gui,
            permissions.okapiTimersPatch.gui,
            permissions.checkinAll.gui,
            permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
          ],
          patronGroup.name,
        )
          .then((userProperties) => {
            userForRequest = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userForRequest.userId,
              testData.userServicePoint.id,
            );
            cy.login(userForRequest.username, userForRequest.password, {
              path: SettingsMenu.circulationPatronNoticeTemplatesPath,
              waiter: NewNoticePolicyTemplate.waitLoading,
            });
          });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      Requests.getRequestApi({ query: `(item.barcode=="${instanceData.itemBarcode}")` }).then(
        (requestResponse) => {
          Requests.deleteRequestViaApi(requestResponse[0].id);
        },
      );
      UserEdit.changeServicePointPreferenceViaApi(userForRequest.userId, [
        testData.userServicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(userForCheckOut.userId, [
        testData.userServicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userForRequest.userId);
      Users.deleteViaApi(userForCheckOut.userId);
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
      PatronGroups.deleteViaApi(patronGroup.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.itemRecaled.name}` }).then(
        (templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        },
      );
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.recallRequest.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.awaitingPickUp.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.holdShelfBeforeOnce.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.holdShelfBeforeRecurring.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${noticeTemplates.holdShelfUponAt.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
      cy.deleteLoanType(testData.loanTypeId);
    });

    it(
      'C347867 Item recalled + Recall request + Awaiting pickup + Hold shelf expiration triggers (volaris)',
      { tags: ['criticalPathFlaky', 'volaris', 'C347867'] },
      () => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplates.itemRecaled);
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.itemRecaled);

        const duplicate = true;
        NewNoticePolicyTemplate.createPatronNoticeTemplate(noticeTemplates.recallRequest);
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.recallRequest);
        NewNoticePolicyTemplate.createPatronNoticeTemplate(
          noticeTemplates.awaitingPickUp,
          duplicate,
        );
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.awaitingPickUp);
        NewNoticePolicyTemplate.createPatronNoticeTemplate(
          noticeTemplates.holdShelfBeforeOnce,
          duplicate,
        );
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.holdShelfBeforeOnce);
        NewNoticePolicyTemplate.createPatronNoticeTemplate(
          noticeTemplates.holdShelfBeforeRecurring,
          duplicate,
        );
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.holdShelfBeforeRecurring);
        NewNoticePolicyTemplate.createPatronNoticeTemplate(
          noticeTemplates.holdShelfUponAt,
          duplicate,
        );
        NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.holdShelfUponAt);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        NewNoticePolicy.openTabCirculationPatronNoticePolicies();
        NewNoticePolicy.waitLoading();
        cy.wait(2000);

        NewNoticePolicy.startAdding();
        NewNoticePolicy.checkInitialState();
        NewNoticePolicy.fillGeneralInformation(noticePolicy);
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.itemRecaled));
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.recallRequest));
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.awaitingPickUp), 1);
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.holdShelfBeforeOnce), 2);
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.holdShelfBeforeRecurring), 3);
        NewNoticePolicy.addNotice(selectOptions(noticeTemplates.holdShelfUponAt), 4);
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

        cy.login(userForRequest.username, userForRequest.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
        CheckOutActions.checkOutUser(userForCheckOut.barcode);
        CheckOutActions.checkUserInfo(userForCheckOut, patronGroup.name);
        CheckOutActions.checkOutItem(instanceData.itemBarcode);
        Checkout.verifyResultsInTheRow([instanceData.itemBarcode]);
        CheckOutActions.endCheckOutSession();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        Requests.waitLoading();
        NewRequest.createNewRequest({
          itemBarcode: instanceData.itemBarcode,
          itemTitle: instanceData.title,
          requesterBarcode: userForRequest.barcode,
          pickupServicePoint: testData.userServicePoint.name,
          requestType: REQUEST_TYPES.RECALL,
        });
        NewRequest.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.checkInItemGui(instanceData.itemBarcode);
        AwaitingPickupForARequest.unselectCheckboxPrintSlip();
        AwaitingPickupForARequest.closeModal();
        CheckInActions.verifyLastCheckInItem(instanceData.itemBarcode);
        CheckInActions.endCheckInSession();

        // wait for the hold shelf expires
        cy.wait(200000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        checkNoticeIsSent({
          ...searchResultsData(noticeTemplates.itemRecaled.name),
          desc: `Template: ${noticeTemplates.itemRecaled.name}. Triggering event: Item recalled.`,
          userBarcode: userForCheckOut.barcode,
        });
        checkNoticeIsSent({
          ...searchResultsData(noticeTemplates.recallRequest.name),
          desc: `Template: ${noticeTemplates.recallRequest.name}. Triggering event: Recall request.`,
        });
        checkNoticeIsSent({
          ...searchResultsData(noticeTemplates.awaitingPickUp.name),
          desc: `Template: ${noticeTemplates.awaitingPickUp.name}. Triggering event: Available.`,
        });
        checkNoticeIsSent(searchResultsData(noticeTemplates.holdShelfBeforeOnce.name));
        checkNoticeIsSent(searchResultsData(noticeTemplates.holdShelfBeforeRecurring.name));
        cy.wait(25000);
        checkNoticeIsSent(searchResultsData(noticeTemplates.holdShelfUponAt.name));
      },
    );
  });
});
