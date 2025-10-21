import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const noticeTemplates = [
    {
      ...createNoticeTemplate({
        name: 'Automated_trigger_template',
        noticeOptions: {
          send: 'Upon/At',
          action: 'Loan due date/time',
          realTimeOption:
            'Send throughout the day without multiple loans/items. Useful for short-term loans.',
        },
      }),
      body: '{{loan.additionalInfo}}',
      previewText: 'Please bring donuts for the librarians when returning this item.',
    },
    {
      ...createNoticeTemplate({
        name: 'Manual_trigger_template',
        noticeOptions: {
          action: 'Loan due date change',
        },
      }),
      body: '{{loan.additionalInfo}}',
      previewText: 'Please bring donuts for the librarians when returning this item.',
    },
  ];
  const noticePolicy = {
    name: getTestEntityValue('loanAdditionalInfo'),
    description: 'Created by autotest team',
  };
  const loanPolicyBody = {
    id: uuid(),
    name: getTestEntityValue('1_minute'),
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      period: {
        duration: 1,
        intervalId: 'Minutes',
      },
      profileId: 'Rolling',
    },
    renewable: true,
    renewalsPolicy: {
      unlimited: false,
      numberAllowed: 2,
      renewFromId: 'SYSTEM_DATE',
    },
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
        testData.itemBarcodes = testData.folioInstances[0].barcodes;
        testData.itemIds = testData.folioInstances[0].itemIds;
      });

    LoanPolicy.createViaApi(loanPolicyBody);
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.uiCirculationSettingsNoticeTemplates.gui,
      Permissions.uiCirculationSettingsNoticePolicies.gui,
      Permissions.checkoutAll.gui,
      Permissions.checkinAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );
      cy.loginAsAdmin({
        path: SettingsMenu.circulationPatronNoticeTemplatesPath,
        waiter: NewNoticePolicyTemplate.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcodes[0],
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    cy.deleteLoanPolicy(loanPolicyBody.id);
    NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    cy.deleteLoanType(testData.loanTypeId);
    Locations.deleteViaApi(testData.defaultLocation);
    noticeTemplates.forEach((template) => {
      NoticePolicyTemplateApi.getViaApi({ query: `name=${template.name}` }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
    });
  });

  it(
    'C414969 Patron notices: Correct (latest) value sent on loan.additionalInfo token (volaris)',
    { tags: ['extendedPath', 'volaris', 'C414969'] },
    () => {
      noticeTemplates.forEach((template, index) => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
        NewNoticePolicyTemplate.checkAfterSaving(template);
      });

      NewNoticePolicy.openTabCirculationPatronNoticePolicies();
      NewNoticePolicy.waitLoading();

      NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
      NewNoticePolicy.checkPolicyName(noticePolicy);

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
        testData.noticePolicyId = noticePolicyRes[0].id;
        CirculationRules.addRuleViaApi(
          { t: testData.loanTypeId },
          { n: testData.noticePolicyId, l: loanPolicyBody.id },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
      });
      Checkout.checkoutItemViaApi({
        itemBarcode: testData.itemBarcodes[0],
        servicePointId: testData.servicePoint.id,
        userBarcode: testData.user.barcode,
      });

      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.openUser(testData.user.username);
      UsersCard.viewCurrentLoans();
      LoansPage.checkAll();
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.fillDate(moment().add(10, 'days').calendar());
      ChangeDueDateForm.saveAndClose();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      cy.log(testData.itemBarcodes[0]);
      SearchPane.searchByUserBarcode(testData.user.barcode);
      const searchResults = {
        userBarcode: testData.user.barcode,
        itemBarcode: testData.itemBarcodes[0],
        object: 'Notice',
        circAction: 'Send',
        servicePoint: testData.servicePoint.name,
        source: 'System',
        desc: `Template: ${noticeTemplates[1].name}. Triggering event: Manual due date change.`,
      };
      SearchPane.findResultRowIndexByContent(searchResults.desc).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResults, rowIndex);
      });
    },
  );
});
