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
import Orders from '../../../support/fragments/orders/orders';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let budget;
    const quantityOfItems = '17';
    // 981$b in the fixture holds this placeholder; the fund code must have the same length
    // so the MARC record lengths stay valid after the replacement
    const fundCodePlaceholder = 'AT_FUND_PLACEHOLD';
    const marcFile = {
      fixtureName: 'marcFileForC375989.mrc',
      modifiedFileName: `C375989 modifiedFile${getRandomPostfix()}.mrc`,
      marcFileName: `C375989 autotestFileName${getRandomPostfix()}.mrc`,
    };
    const mappingProfile = {
      name: `C375989 Test Order mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      approved: true,
      vendor: VENDOR_NAMES.GOBI,
      reEncumber: 'false',
      title: '245$a',
      mustAcknowledgeReceivingNote: 'false',
      publicationDate: '264$c; else 260$c',
      publisher: '264$b; else 260$b',
      edition: '250$a',
      internalNote: '981$d',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.ELECTRONIC_RESOURCE,
      receiptStatus: 'Pending',
      paymentStatus: 'Pending',
      selector: '981$e',
      cancellationRestriction: 'false',
      rush: '981$h',
      receivingWorkflow: 'Synchronized',
      accountNumber: '981$g',
      instructionsToVendor: '981$f',
      electronicUnitPrice: '980$b',
      quantityElectronic: '980$g',
      currency: 'USD',
      accessProvider: VENDOR_NAMES.GOBI,
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '020$a',
      qualifier: '020$q',
      productIDType: 'ISBN',
      vendorReferenceNumber: '980$f',
      vendorReferenceType: 'Vendor order reference number',
      fundId: '981$b',
      expenseClass: '981$c',
      value: '100',
      type: '%',
      locationName: '049$a',
      locationQuantityElectronic: '980$g',
    };
    const actionProfile = {
      name: `C375989 Test Order action profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C375989 Test Order ${getRandomPostfix()}`,
    };

    before('Create fund with budget, user and login', () => {
      cy.getAdminToken();
      ExpenseClasses.getExpenseClassesViaApi({ query: 'name=="Electronic"' }).then(
        ([electronicExpenseClass]) => {
          const finance = Budgets.createBudgetWithFundLedgerAndFYViaApi({
            fund: { code: `AT_C375989_${randomNDigitNumber(6)}` },
            budget: { allocated: 10000 },
            expenseClasses: [electronicExpenseClass],
          });
          budget = finance.budget;

          DataImport.editMarcFile(
            marcFile.fixtureName,
            marcFile.modifiedFileName,
            [new RegExp(fundCodePlaceholder, 'g')],
            [finance.fund.code],
          );
        },
      );

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${marcFile.modifiedFileName}`);
      cy.getAdminToken().then(() => {
        Orders.getOrdersApi({
          limit: 100,
          query: `metadata.createdByUserId=="${user.userId}"`,
        }).then((orders) => {
          orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
        });
        Budgets.getBudgetByIdViaApi(budget.id).then((budgetResp) => {
          Budgets.updateBudgetViaApi({ ...budgetResp, statusExpenseClasses: [] });
        });
        Budgets.deleteBudgetWithFundLedgerAndFYViaApi(budget);
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C375989 Verify the importing of eBook orders with open status (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375989'] },
      () => {
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFile.modifiedFileName, marcFile.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFile.marcFileName);
        Logs.checkJobStatus(marcFile.marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.marcFileName);
        FileDetails.checkOrderQuantityInSummaryTable(quantityOfItems);
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.verifyPOLDetailsIsOpened();
      },
    );
  });
});
