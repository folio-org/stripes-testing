import {
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { Budgets } from '../../../support/fragments/finance';
import OrderLines from '../../../support/fragments/orders/orderLines';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      expenseClass: ExpenseClasses.getDefaultExpenseClass(),
      user: {},
    };
    const marcFile = {
      filePath: 'marcBibFileForC584529.mrc',
      modifiedFileName: `C584529 autotestFileName${getRandomPostfix()}.mrc`,
      marcFileName: `C584529 autotestFileName${getRandomPostfix()}.mrc`,
    };

    const mappingProfile = {
      name: `C584529 Import order with fund and class field ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      approved: true,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receivingWorkflow: 'Synchronized',
      physicalUnitPrice: '"20"',
      quantityPhysical: '"1"',
      currency: 'USD',
      fundId: '980$a',
      expenseClass: '980$f',
      value: '100',
      type: '%',
    };
    const actionProfile = {
      name: `C584529 Import order with fund and class field ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C584529 Import order with fund and class field ${getRandomPostfix()}`,
    };

    before('Create user and login', () => {
      // create fund and expense class via API
      cy.getAdminToken();
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 100 },
      });
      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      ExpenseClasses.createExpenseClassViaApi(testData.expenseClass).then((expenseClassResp) => {
        Budgets.getBudgetByIdViaApi(testData.budget.id).then((budgetResp) => {
          Budgets.updateBudgetViaApi({
            ...budgetResp,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: expenseClassResp.id,
              },
            ],
          });
        });
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${marcFile.modifiedMarcFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C584529 Importing order with newly created fund code (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584529'] },
      () => {
        const fundAndExpenseClassData = [
          {
            fund: `${testData.fund.name}(${testData.fund.code})`,
            expenseClass: testData.expenseClass.name,
            value: '100%',
            amount: '$20.00',
          },
        ];

        // create mapping profile
        FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // change file
        DataImport.editMarcFile(
          marcFile.filePath,
          marcFile.modifiedFileName,
          ['expenseClassCode', 'fundCode'],
          [testData.expenseClass.code, testData.fund.code],
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFile.modifiedFileName, marcFile.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFile.marcFileName);
        Logs.checkJobStatus(marcFile.marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.marcFileName);
        [
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.DASH, columnName);
        });
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.verifyPOLDetailsIsOpened();
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);
      },
    );
  });
});
