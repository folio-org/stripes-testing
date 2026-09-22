import Budgets from '../../support/fragments/finance/budgets/budgets';
import DataImport from '../../support/fragments/data_import/dataImport';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import FieldMappingProfiles from '../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import Permissions from '../../support/dictionary/permissions';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../support/fragments/settings/dataImport';
import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../support/constants';

describe('Orders', () => {
  const EXPENSE_CLASS_NAME = 'Electronic';
  let testData;
  let marcFile;
  let mappingProfile;
  let actionProfile;
  let jobProfile;

  const createFinanceData = () => {
    return FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      return Ledgers.createViaApi({
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      }).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        }).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 100,
          }).then((budgetResponse) => {
            testData.budget = budgetResponse;

            // Use predefined expense class: newly created ones are not resolved by import right away
            return ExpenseClasses.getExpenseClassesViaApi({
              query: `name=="${EXPENSE_CLASS_NAME}"`,
              limit: 1,
            }).then(([expenseClass]) => {
              testData.expenseClass = expenseClass;

              return Budgets.getBudgetByIdViaApi(budgetResponse.id).then((budget) => {
                return Budgets.updateBudgetViaApi({
                  ...budget,
                  statusExpenseClasses: [{ status: 'Active', expenseClassId: expenseClass.id }],
                });
              });
            });
          });
        });
      });
    });
  };

  const createImportProfiles = () => {
    cy.loginAsAdmin({
      path: SettingsMenu.mappingProfilePath,
      waiter: FieldMappingProfiles.waitLoading,
    });
    FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

    SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
    SettingsActionProfiles.create(actionProfile, mappingProfile.name);
    SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

    SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkActionProfile(actionProfile);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);
  };

  const importOrder = () => {
    DataImport.uploadFileViaApi(marcFile.filePath, marcFile.marcFileName, jobProfile.profileName);

    return OrderLines.getOrderLineViaApi({
      query: `titleOrPackage=="${testData.orderLineTitle}"`,
    }).then((orderLines) => {
      testData.orderLine = orderLines[0];

      return Orders.getOrderByIdViaApi(testData.orderLine.purchaseOrderId).then((order) => {
        testData.order = order;
      });
    });
  };

  // Fund is added to the imported PO line via API
  const addFundToImportedOrderLine = () => {
    return OrderLines.updateOrderLineViaApi({
      ...testData.orderLine,
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
    });
  };

  // Restrict the fund only after it is added to the PO line with the invalid location
  const restrictFundByLocation = () => {
    return Funds.updateFundViaApi({
      ...testData.fund,
      restrictByLocations: true,
      locations: [{ locationId: testData.locations.firstLocation.id }],
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    const postfix = getRandomPostfix();

    testData = {
      fiscalYear: {},
      ledger: {},
      fund: {},
      budget: {},
      expenseClass: {},
      locations: {
        firstLocation: {},
        secondLocation: {},
      },
      orderLineTitle: `AT_C436857_OrderLine_${postfix}`,
      order: {},
      orderLine: {},
      user: {},
    };
    marcFile = {
      filePath: 'marcBibFileC436857.mrc',
      marcFileName: `C436857 autotestFileName${postfix}.mrc`,
    };
    actionProfile = {
      name: `AT_C436857_ActionProfile_${postfix}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
    };
    jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C436857_JobProfile_${postfix}`,
    };

    cy.getAdminToken();
    Locations.getViaApiAnyDefault(2)
      .then(([firstLocation, secondLocation]) => {
        testData.locations = { firstLocation, secondLocation };
        mappingProfile = {
          name: `AT_C436857_MappingProfile_${postfix}`,
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          orderStatus: ORDER_STATUSES.PENDING,
          approved: true,
          vendor: VENDOR_NAMES.GOBI,
          title: `"${testData.orderLineTitle}"`,
          acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
          orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
          receivingWorkflow: 'Synchronized',
          physicalUnitPrice: '"20"',
          quantityPhysical: '"1"',
          currency: 'USD',
          locationName: `"${secondLocation.name} (${secondLocation.code})"`,
          locationQuantityPhysical: '"1"',
        };
      })
      .then(() => createFinanceData())
      .then(() => createImportProfiles())
      .then(() => importOrder())
      .then(() => addFundToImportedOrderLine())
      .then(() => restrictFundByLocation())
      .then(() => cy.createTempUser([
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersEdit.gui,
      ]))
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      if (testData.order.id) {
        Orders.deleteOrderViaApi(testData.order.id);
      }
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      if (mappingProfile) {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      }
      Budgets.getBudgetByIdViaApi(testData.budget.id).then((budget) => {
        Budgets.updateBudgetViaApi({ ...budget, statusExpenseClasses: [] });
        Budgets.deleteViaApi(testData.budget.id);
      });
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C436857 Imported order with invalid location for restricted fund can not be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436857'] },
    () => {
      // Step 1: Go to imported Order from Preconditions
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Open order - error toast appears and order remains "Pending"
      Orders.openOrder();
      Orders.checkInvalidLocationErrorMessage(testData.orderLine.poLineNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 3: Click PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLineTitle);
      OrderLines.checkLocationRestrictedErrorMessage();
    },
  );
});
