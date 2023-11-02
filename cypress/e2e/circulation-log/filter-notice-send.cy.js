import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi, {
  getDefaultNoticePolicy,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
let addedCirculationRule;
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
  instanceTitle: `Instance ${getRandomPostfix()}`,
  barcode: `item-${getRandomPostfix()}`,
};
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(
    'autotest receive notice check in',
    uuid(),
  ),
};

describe('circulation-log', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.checkoutAll.gui]).then((userProperties) => {
      user = userProperties;

      ServicePoints.createViaApi(testData.userServicePoint);
      cy.createLoanType({
        name: `type_${getRandomPostfix()}`,
      }).then((loanType) => {
        testData.loanTypeId = loanType.id;
      });

      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user.userId,
        testData.userServicePoint.id,
      );

      cy.getCirculationRules().then((response) => {
        testData.baseRules = response.rulesAsText;
        testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
      });

      NoticePolicyTemplateApi.createViaApi(templateBody).then(() => {
        NoticePolicyApi.createWithTemplateApi(noticePolicy);
      });

      InventoryInstances.createInstanceViaApi(item.instanceTitle, item.barcode);
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
        (res) => {
          res.permanentLoanType = { id: testData.loanTypeId };
          cy.updateItemViaApi(res);
        },
      );

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((response) => {
        testData.ruleProps.n = response[0].id;
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

      cy.login(user.username, user.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
      CheckOutActions.checkOutUser(user.barcode);
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: item.barcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: user.barcode,
      });
      CheckOutActions.endCheckOutSession();
      cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
    });
  });

  after('delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: item.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: moment.utc().format(),
    });
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    cy.deleteLoanType(testData.loanTypeId);
    NoticePolicyTemplateApi.getViaApi({ query: `name=${templateBody.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
  });

  it(
    'C17092 Filter circulation log by (notice) send (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
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

      SearchPane.setFilterOptionFromAccordion('notice', 'Send');
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);

      SearchPane.searchByUserBarcode(user.barcode);
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);
    },
  );
});
