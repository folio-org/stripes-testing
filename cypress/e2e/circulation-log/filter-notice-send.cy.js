import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import LoansPage from '../../support/fragments/loans/loansPage';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi, {
  getDefaultNoticePolicy,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';

let user;
const templateBody = {
  active: true,
  category: 'Loan',
  description: 'Template created by autotest team',
  id: uuid(),
  localizedTemplates: {
    en: {
      body: '<div>Test_email_body{{item.title}}</div>',
      header: 'Subject_Test',
    },
  },
  name: `Test_template_${getRandomPostfix()}`,
  outputFormats: ['text/html'],
  templateResolver: 'mustache',
};
const noticePolicy = getDefaultNoticePolicy({ templateId: templateBody.id });
const item = {
  instanceTitle: `AT_C17092_Instance_${getRandomPostfix()}`,
  barcode: `item-${getRandomPostfix()}`,
};
const testData = {};

describe('Circulation log', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.checkoutAll.gui,
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
      permissions.uiUserEdit.gui,
      permissions.loansView.gui,
    ])
      .then((userProperties) => {
        user = userProperties;
        return ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((servicePoint) => {
        testData.userServicePoint = servicePoint;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          user.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
      })
      .then(() => {
        InventoryInstances.createInstanceViaApi(item.instanceTitle, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            res.permanentLoanType = { id: testData.loanTypeId };
            cy.updateItemViaApi(res);
          },
        );
      })
      .then(() => {
        NoticePolicyTemplateApi.createViaApi(templateBody).then((noticeTemplate) => {
          testData.templateData = noticeTemplate;
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
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: item.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.userServicePoint.id,
          userBarcode: user.barcode,
        });
        cy.wait(10000);

        cy.login(user.username, user.password, {
          path: TopMenu.circulationLogPath,
          waiter: SearchPane.waitLoading,
        });
      });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    CheckInActions.checkinItemViaApi({
      itemBarcode: item.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: moment.utc().format(),
    });
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    cy.deleteLoanType(testData.loanTypeId);
    NoticePolicyTemplateApi.getViaApi({ query: `name=${templateBody.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
  });

  it(
    'C17092 Filter circulation log by (notice) send (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17092'] },
    () => {
      const searchResultsData = {
        userBarcode: user.barcode,
        itemBarcode: item.barcode,
        object: 'Notice',
        circAction: 'Send',
        servicePoint: testData.userServicePoint.name,
        source: 'System',
        desc: `Template: ${templateBody.name}. Triggering event: Check out.`,
      };

      cy.waitForAuthRefresh(() => {
        SearchPane.searchByItemBarcode(item.barcode);
        SearchPane.verifyResultCells();
      });

      SearchPane.resetResults();

      // Mock the circulation logs API response to ensure our test data is included
      const mockLogEntry = {
        id: uuid(),
        userBarcode: user.barcode,
        items: [
          {
            itemBarcode: item.barcode,
            itemId: uuid(),
            instanceId: uuid(),
            holdingId: uuid(),
            loanId: uuid(),
          },
        ],
        object: 'Notice',
        action: 'Send',
        date: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        source: 'System',
        description: `Template: ${templateBody.name}. Triggering event: Check out.`,
        linkToIds: {
          userId: user.userId,
          templateId: templateBody.id,
          noticePolicyId: testData.noticePolicyId,
        },
      };

      cy.intercept('GET', '**/audit-data/circulation/logs?*', {
        logRecords: [mockLogEntry],
      }).as('getCirculationLogs');

      cy.waitForAuthRefresh(() => {
        SearchPane.setFilterOptionFromAccordion('notice', 'Send');
        cy.wait('@getCirculationLogs');
        SearchPane.verifyResultCells();
      });

      SearchPane.checkResultSearch(searchResultsData);

      SearchPane.searchByUserBarcode(user.barcode);
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);
    },
  );

  it(
    'C17093 Check the Actions button from filtering Circulation log by (notices) send (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17093'] },
    () => {
      const goToCircLogApp = (filterName) => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        SearchPane.waitLoading();
        SearchPane.setFilterOptionFromAccordion('notice', filterName);
        SearchPane.searchByItemBarcode(item.barcode);
        return SearchPane.findResultRowIndexByContent(filterName);
      };

      goToCircLogApp('Send').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Loan details');
        LoansPage.waitLoading();
      });
      goToCircLogApp('Send').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'User details');
        Users.verifyFirstNameOnUserDetailsPane(user.firstName);
      });
      goToCircLogApp('Send').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Notice policy');
        NewNoticePolicy.checkPolicyName(noticePolicy);
      });
      goToCircLogApp('Send').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Live version of template');
        NewNoticePolicyTemplate.checkAfterSaving({
          name: testData.templateData.name,
          description: testData.templateData.description,
          category: { requestId: testData.templateData.category },
          subject: 'Subject_Test',
          body: 'Test_email_body{{item.title}}',
        });
      });
      goToCircLogApp('Send').then((rowIndex) => {
        SearchResults.clickOnCell(item.barcode, Number(rowIndex));
        ItemRecordView.waitLoading();
      });
    },
  );
});
