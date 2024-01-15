import { Permissions } from '../../../support/dictionary';
import {
  SettingsDataImport,
  ActionProfiles,
  JobProfiles,
  FieldMappingProfiles,
  FieldMappingProfileView,
} from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { OrderLines, Orders } from '../../../support/fragments/orders';
import DataImport from '../../../support/fragments/data_import/dataImport';
import DataImportJobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ORDER_STATUSES, JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Settings', () => {
    const fieldMappingProfile = `autotest_mapping_profile_name_${getRandomPostfix()}`;
    const actionProfile = `autotest_action_profile_name_${getRandomPostfix()}`;
    const jobProfile = `autotest_job_profile_name_${getRandomPostfix()}`;
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
            { name: 'Lewis, Meriwether', type: 'Personal name' },
            { name: 'American Philosophical Society', type: 'Corporate name' },
            { name: 'Lewis and Clark Expedition', type: 'Meeting name' },
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
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      },
      user: {},
    };

    before('Create test data', () => {
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
        ActionProfiles.deleteActionProfileByNameViaApi(actionProfile);
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
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Field mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILE);

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
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILE);

        // Click on "Actions" button, Select "New action profile" option
        const ActionProfileEditForm = ActionProfiles.createNewActionProfile();

        // Fill action profile fields
        ActionProfileEditForm.fillActionProfileFields({ ...testData.actionProfile });

        // Click "Save as profile & Close"
        ActionProfileEditForm.clickSaveAndCloseButton();

        // Select "Job profiles" element from the "Data import" pane
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILE);

        // Click on "Actions" button, Select "New job profile" option
        const JobProfileEditForm = JobProfiles.createNewJobProfile();

        // Fill job profile fields
        JobProfileEditForm.fillJobProfileFields({ ...testData.jobProfile });

        // Click "Save as profile & Close"
        JobProfileEditForm.clickSaveAndCloseButton();

        // Go to the "Data Import" app
        cy.visit(TopMenu.dataImportPath);

        // Click on the "or choose files" button,  Select file from the precondition, Click on the "Open" button
        DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);

        // Select job profile
        DataImportJobProfiles.search(jobProfile);

        // Click on the "Actions" button,  Select "Run", Click on the "Run" button
        JobProfiles.runImportFile();
        DataImportJobProfiles.waitFileIsImported(testData.marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        // Go to the "Orders" app, Click "Order lines"
        cy.visit(TopMenu.orderLinesPath);

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
