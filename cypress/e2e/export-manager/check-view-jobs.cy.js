import {
  ACCOUNT_STATUSES,
  DEFAULT_WAIT_TIME,
  EXPORT_MANAGER_EDI_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOB_STATUS_MAPPING,
  FTP_PROTOCOLS,
  ORDER_STATUSES,
  ORDER_TYPES,
  ORGANIZATION_INTEGRATION_CONFIG,
  ORGANIZATION_PAYMENT_METHODS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExecutionFlowManager } from '../../support/utils';
import { ExportDetails, Exports } from '../../support/fragments/exportManager';
import { formatDateTime } from '../../support/utils/acquisitions';

const {
  END_TIME,
  ERROR_DETAILS,
  EXPORT_METHOD,
  FILE_NAME,
  JOB_ID,
  ORGANIZATION,
  SENT_TO,
  SOURCE,
  START_TIME,
  STATUS,
} = EXPORT_MANAGER_EDI_JOB_FIELD_LABELS;

const getSentToValue = (job) => {
  const { serverAddress, orderDirectory } =
    job.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediFtp;

  return `${serverAddress}${orderDirectory}`;
};

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const order = {
        ...NewOrder.defaultOneTimeOrder,
        orderType: ORDER_TYPES.ONGOING,
        ongoing: { isSubscription: false, manualRenewal: false },
        approved: true,
      };
      const organization = {
        ...NewOrganization.defaultUiOrganizations,
        accounts: [
          {
            accountNo: getRandomPostfix(),
            accountStatus: ACCOUNT_STATUSES.ACTIVE,
            acqUnitIds: [],
            appSystemNo: '',
            description: 'Main library account',
            libraryCode: 'COB',
            libraryEdiCode: getRandomPostfix(),
            name: 'TestAccout1',
            notes: '',
            paymentMethod: ORGANIZATION_PAYMENT_METHODS.CASH,
          },
          {
            accountNo: getRandomPostfix(),
            accountStatus: ACCOUNT_STATUSES.ACTIVE,
            acqUnitIds: [],
            appSystemNo: '',
            description: 'Main library account',
            libraryCode: 'COB',
            libraryEdiCode: getRandomPostfix(),
            name: 'TestAccout2',
            notes: '',
            paymentMethod: ORGANIZATION_PAYMENT_METHODS.CASH,
          },
        ],
      };
      const integrationName = `AT_ORG_INT_${getRandomPostfix()}`;

      const flow = new ExecutionFlowManager();
      const R = {
        ACQ_METHOD: 'acqMethod',
        JOB: 'job',
        INSTANCE: 'instance',
        INTEGRATION: 'integration',
        LOCALE: 'locale',
        LOCATION: 'location',
        MATERIAL_TYPE: 'mType',
        ORDER: 'order',
        ORDER_LINE: 'orderLine',
        ORGANIZATION: 'organization',
        USER: 'user',
      };
      const USER_PERMISSIONS = [
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiExportOrders.gui,
        Permissions.exportManagerAll.gui,
        Permissions.exportManagerDownloadAndResendFiles.gui,
      ];

      before(() => {
        cy.getAdminToken();
        cy.clearLocalStorage();

        cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

        flow
          .step((f) => {
            return InventoryInstance.createInstanceViaApi().then(({ instanceData }) => f.set(R.INSTANCE, instanceData, (value) => InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(value.instanceId)));
          })
          .step((f) => {
            return cy.getLocations().then((location) => f.set(R.LOCATION, location));
          })
          .step((f) => {
            return Organizations.createOrganizationViaApi(organization).then((organizationId) => {
              organization.id = organizationId;
              order.vendor = organizationId;

              return f.set(R.ORGANIZATION, organization, (value) => Organizations.deleteOrganizationViaApi(value.id));
            });
          })
          .step(() => {
            return cy
              .getAcquisitionMethodsApi()
              .then(({ body: { acquisitionMethods } }) => flow.set(R.ACQ_METHOD, acquisitionMethods[0]));
          })
          .step(() => {
            return cy
              .getDefaultMaterialType()
              .then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
          })
          .step((f) => {
            const integration = Integrations.getDefaultIntegration({
              accountNoList: organization.accounts.map(({ accountNo }) => accountNo),
              integrationName,
              acqMethodId: f.get(R.ACQ_METHOD).id,
              integrationType: ORGANIZATION_INTEGRATION_CONFIG.INTEGRATION_TYPES.ORDERING,
              type: ORGANIZATION_INTEGRATION_CONFIG.EXPORT_TYPES.EDIFACT_ORDERS,
              vendorId: f.get(R.ORGANIZATION).id,
              fileFormat: ORGANIZATION_INTEGRATION_CONFIG.FILE_FORMATS.EDI,
              isDefaultConfig: true,
              ediFtp: {
                ftpFormat: FTP_PROTOCOLS.SFTP,
                serverAddress: ORGANIZATION_INTEGRATION_CONFIG.DEFAULT_FTP_SERVER_ADDRESS,
                orderDirectory: ORGANIZATION_INTEGRATION_CONFIG.DEFAULT_ORDERS_DIRECTORY,
              },
            });

            return Integrations.createIntegrationViaApi(integration)
              .then(() => Integrations.getIntegrationConfigViaApi(integration.id))
              .then((data) => f.set(R.INTEGRATION, data, () => Integrations.deleteIntegrationViaApi(data.id)));
          })
          .step((f) => {
            return cy
              .createOrderApi(order)
              .then((response) => f.set(R.ORDER, response.body, (value) => Orders.deleteOrderViaApi(value.id, false)));
          })
          .step((f) => {
            return OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.defaultOrderLine,
              purchaseOrderId: f.get(R.ORDER).id,
              automaticExport: true,
              acquisitionMethod: f.get(R.ACQ_METHOD).id,
              vendorDetail: {
                vendorAccount: organization.accounts[0].accountNo,
              },
              physical: {
                createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
                materialType: flow.get(R.MATERIAL_TYPE).id,
                materialSupplier: flow.get(R.ORGANIZATION).id,
                volumes: [],
              },
              locations: [],
            }).then((r) => f.set(R.ORDER_LINE, r, () => OrderLines.deleteOrderLineViaApi(r.id, false)));
          })
          .step((f) => {
            return Orders.updateOrderViaApi({
              ...f.get(R.ORDER),
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          })
          .step((f) => {
            return Exports.createExportJobViaApi(f.get(R.INTEGRATION)).then((j) => flow.set(R.JOB, j));
          })
          .step((f) => {
            return Exports.getFinishedExportJobViaApi(f.get(R.JOB).id).then((j) => flow.set(R.JOB, j));
          })
          .step((f) => {
            return cy
              .createTempUser(USER_PERMISSIONS)
              .then((userProperties) => f.set(R.USER, userProperties, (value) => Users.deleteViaApi(value.userId)));
          })
          .step((f) => {
            return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
              path: TopMenu.exportManagerPath,
              waiter: ExportManagerSearchPane.waitLoading,
            });
          });
      });

      after(() => {
        cy.getAdminToken();
        flow.cleanup();
      });

      it(
        'C347885 Check view for jobs on Export Manager page (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C347885'] },
        () => {
          const { job, organization: org, locale } = flow.ctx();

          cy.log('Step 1. Open Export Manager and search organization jobs');
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.waitLoading();

          cy.log('Step 2. Search for failed export jobs');
          ExportManagerSearchPane.searchByFailed();
          ExportManagerSearchPane.searchBySuccessful();
          ExportManagerSearchPane.filterByExportMethod(integrationName);

          cy.log('Step 3. Open the job and verify its details pane');
          ExportManagerSearchPane.selectJobByIntegrationInList(job.name);
          ExportManagerSearchPane.verifyThirdPaneExportJobExist({ waitMs: DEFAULT_WAIT_TIME });
          ExportDetails.verifyJobLabels();
          ExportDetails.checkExportJobDetails({
            exportInformation: [
              { key: JOB_ID, value: job.name },
              { key: ORGANIZATION, value: org.name },
              { key: EXPORT_METHOD, value: integrationName },
              { key: FILE_NAME, value: job.fileNames[0] },
              { key: STATUS, value: EXPORT_MANAGER_JOB_STATUS_MAPPING[job.status] },
              { key: SOURCE, value: job.source },
              { key: ERROR_DETAILS, value: job.errorDetails || '-' },
              { key: SENT_TO, value: getSentToValue(job) },
              { key: START_TIME, value: formatDateTime(locale, job.startTime) },
              { key: END_TIME, value: formatDateTime(locale, job.endTime) },
            ],
          });
        },
      );
    });
  });
});
