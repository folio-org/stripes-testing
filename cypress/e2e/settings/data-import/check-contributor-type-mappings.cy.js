import { APPLICATION_NAMES, JOB_STATUS_NAMES, ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import DataImportJobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { OrderLines, Orders } from '../../../support/fragments/orders';
import {
  FieldMappingProfileView,
  FieldMappingProfiles,
  JobProfiles,
  ActionProfiles as SettingsActionProfiles,
  SettingsDataImport,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const fieldMappingProfile = `C376006 autotest_mapping_profile_name_${getRandomPostfix()}`;
    const actionProfile = `C376006 autotest_action_profile_name_${getRandomPostfix()}`;
    const jobProfile = `C376006 autotest_job_profile_name_${getRandomPostfix()}`;
    const orderLineTitle = '245$a';

    const testData = {
      mappingProfile: {
        summary: {
          name: fieldMappingProfile,
          incomingRecordType: 'MARC Bibliographic',
          existingRecordType: 'Order',
        },
        orderInformation: {
          status: ORDER_STATUSES.PENDING,
          organizationLookUp: 'GOBI Library Solutions',
        },
        orderLineInformation: {
          title: orderLineTitle,
          contributors: [
            { name: '100$a', type: 'Personal name' },
            { name: '710$a', type: 'Corporate name' },
            { name: '711$a', type: 'Meeting name' },
          ],
          productIds: [{ id: '020$a', type: 'ISBN' }],
          poLineDetails: {
            acquisitionMethod: 'Other',
            orderFormat: 'Physical Resource',
            receivingWorkflow: 'Synchronized',
          },
          costDetails: {
            physicalUnitPrice: '1.00',
            currency: 'USD',
          },
          physicalResourceDetails: {
            createInventory: 'Instance',
          },
        },
      },
      actionProfile: {
        summary: {
          name: actionProfile,
        },
        details: {
          action: 'Create',
          recordType: 'Order',
        },
        fieldMappingProfile: {
          name: fieldMappingProfile,
          recordType: 'Order',
        },
      },
      jobProfile: {
        summary: {
          name: jobProfile,
          dataType: 'MARC',
        },
        overview: { action: 'Action', name: actionProfile },
      },
      marcFile: {
        marc: 'marcFileForC376006.mrc',
        fileName: `C376006 testMarcFile.${getRandomPostfix()}.mrc`,
      },
      user: {},
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.dataImportSettingsPath,
          waiter: SettingsDataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfileByNameViaApi(jobProfile);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile);
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(fieldMappingProfile);
        OrderLines.getOrderLineViaApi({ query: `titleOrPackage=="${orderLineTitle}"` }).then(
          (orderLines) => {
            orderLines.forEach((orderLine) => {
              OrderLines.deleteOrderLineViaApi(orderLine.id);
              Orders.deleteOrderViaApi(orderLine.purchaseOrderId);
            });
          },
        );
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C376006 Order field mapping profile: Check Contributor type mappings (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C376006'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Click Actions button, Select New field mapping profile
        const FieldMappingProfileEditForm =
          FieldMappingProfiles.clickCreateNewFieldMappingProfile();

        // Fill mapping profile fields
        FieldMappingProfileEditForm.fillMappingProfileFields({ ...testData.mappingProfile });

        // Click "Save as profile & Close"
        FieldMappingProfileEditForm.clickSaveAndCloseButton();

        // Close the field mapping profile detail mode by clicking "x" on top left corner
        FieldMappingProfileView.clickCloseButton();

        // Select "Action profiles" from the "Data import" pane
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);

        // Click on "Actions" button, Select "New action profile" option
        const ActionProfileEditForm = SettingsActionProfiles.createNewActionProfile();

        // Fill action profile fields
        ActionProfileEditForm.fillActionProfileFields({ ...testData.actionProfile });

        // Click "Save as profile & Close"
        ActionProfileEditForm.clickSaveAndCloseButton();

        // Select "Job profiles" element from the "Data import" pane
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);

        // Click on "Actions" button, Select "New job profile" option
        const JobProfileEditForm = JobProfiles.createNewJobProfile();

        // Fill job profile fields
        JobProfileEditForm.fillJobProfileFields({ ...testData.jobProfile });

        // Click "Save as profile & Close"
        JobProfileEditForm.clickSaveAndCloseButton();

        // Go to the "Data Import" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);

        // Click on the "or choose files" button,  Select file from the precondition, Click on the "Open" button
        DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);

        // Select job profile
        DataImportJobProfiles.search(jobProfile);

        // Click on the "Actions" button,  Select "Run", Click on the "Run" button
        DataImportJobProfiles.runImportFile();
        Logs.checkJobStatus(testData.marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);

        // Go to the "Orders" app, Click "Order lines"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);

        // Fill in the search box with the value of Order lines for example: "original journals" -> Click "Search" button
        OrderLines.searchByParameter('Keyword', orderLineTitle);

        // Click on the POL number hotlink
        const OrderLineDetails = OrderLines.selectOrderLineByIndex();

        // View the Contributors section of the POL
        OrderLineDetails.checkContributorsSectionContent(
          testData.mappingProfile.orderLineInformation.contributors,
        );
      },
    );
  });
});
