import moment from 'moment';

import {
  ACCOUNT_STATUSES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_WAIT_TIME,
  EXPORT_MANAGER_EDI_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOB_STATUS_MAPPING,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  LOCATION_NAMES,
  ORDER_LINE_DISCOUNT_TYPES,
  ORDER_STATUSES,
  ORGANIZATION_PAYMENT_METHODS,
  ORGANIZATION_SEARCH_OPTIONS,
  POL_CREATE_INVENTORY_SETTINGS,
  USER_TYPES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { ExportDetails, Exports } from '../../../support/fragments/exportManager';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import {
  NewOrganization,
  OrganizationDetails,
  Organizations,
} from '../../../support/fragments/organizations';
import IntegrationEditForm from '../../../support/fragments/organizations/integrations/integrationEditForm';
import Integrations from '../../../support/fragments/organizations/integrations/integrations';
import IntegrationViewForm from '../../../support/fragments/organizations/integrations/integrationViewForm';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { CURRENCIES } from '../../../support/fragments/settings/tenant/general/localization';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import { formatDateTime, formatIntlDateTime } from '../../../support/utils/acquisitions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

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

const JOB_TRIGGER_DELAY_MIN = 1;
const RESEND_TRIGGER_DELAY_MIN = 1;
const WRONG_FTP_SERVER_ADDRESS = 'sftp://ftp.ci.folio.org';
const CORRECT_FTP_SERVER_ADDRESS = 'ftp://ftp.ci.folio.org/files';
const SCHEDULE_PERIOD_DAILY = 'Daily';
const ACCOUNT_DESCRIPTION = 'Main library account';
const ACCOUNT_LIBRARY_CODE = 'COB';
const ACCOUNT_NAME = 'TestAccount';

const USER_PERMISSIONS = [
  Permissions.exportManagerAll.gui,
  Permissions.exportManagerDownloadAndResendFiles.gui,
  Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
  Permissions.uiOrganizationsViewEdit.gui,
];

const getIntegrationName = (integration) => integration.integrationName ||
  integration.name ||
  integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;

const getSentToValue = (job) => {
  const { serverAddress, orderDirectory } =
    job.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediFtp;

  return `${serverAddress}${orderDirectory}`;
};

const organization = {
  ...NewOrganization.defaultUiOrganizations,
  accounts: [
    {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      acqUnitIds: [],
      appSystemNo: '',
      description: ACCOUNT_DESCRIPTION,
      libraryCode: ACCOUNT_LIBRARY_CODE,
      libraryEdiCode: getRandomPostfix(),
      name: ACCOUNT_NAME,
      notes: '',
      paymentMethod: ORGANIZATION_PAYMENT_METHODS.CASH,
    },
  ],
};
const order = {
  ...NewOrder.defaultOneTimeOrder,
  approved: true,
};

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      ACQUISITION_METHOD: 'acquisitionMethod',
      INTEGRATION: 'integration',
      INTEGRATION_FIRE_AT: 'integrationFireAt',
      JOB: 'job',
      LOCALE: 'locale',
      LOCATION: 'location',
      MATERIAL_TYPE: 'materialType',
      ORDER: 'order',
      ORDER_LINE: 'orderLine',
      ORGANIZATION: 'organization',
      RESEND_FIRE_AT: 'resendFireAt',
      USER: 'user',
    };

    before('Create C365604 preconditions', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

      flow
        .step((f) => {
          // Precondition 1: Organization-vendor with valid account number exists
          return Organizations.createOrganizationViaApi(organization).then((id) => {
            organization.id = id;
            order.vendor = id;
            return f.set(R.ORGANIZATION, organization, (value) => Organizations.deleteOrganizationViaApi(value.id));
          });
        })
        .step((f) => {
          return cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            })
            .then(({ body }) => f.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
        })
        .step((f) => {
          return cy
            .getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` })
            .then((location) => f.set(R.LOCATION, location));
        })
        .step((f) => {
          return MaterialTypes.createMaterialTypeViaApi(
            MaterialTypes.getDefaultMaterialType(),
          ).then(({ body }) => f.set(R.MATERIAL_TYPE, body, (value) => MaterialTypes.deleteViaApi(value.id)));
        })
        .step((f) => {
          // Precondition 3: Order in 'Open' status with PO line set for integration method exists
          return cy
            .createOrderApi({ ...order })
            .then(({ body }) => f.set(R.ORDER, body, (value) => Orders.deleteOrderViaApi(value.id, false)));
        })
        .step((f) => {
          // Precondition 3: PO line with Acquisition method = Purchase and Automatic export = Active
          return OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.defaultOrderLine,
            purchaseOrderId: f.get(R.ORDER).id,
            automaticExport: true,
            acquisitionMethod: f.get(R.ACQUISITION_METHOD).id,
            cost: {
              listUnitPrice: 20,
              currency: CURRENCIES.US_DOLLAR.value,
              discountType: ORDER_LINE_DISCOUNT_TYPES.PERCENTAGE,
              quantityPhysical: 1,
              poLineEstimatedPrice: 20,
            },
            locations: [{ locationId: f.get(R.LOCATION).id, quantity: 1, quantityPhysical: 1 }],
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: f.get(R.MATERIAL_TYPE).id,
              materialSupplier: f.get(R.ORGANIZATION).id,
              volumes: [],
            },
            vendorDetail: { vendorAccount: organization.accounts[0].accountNo },
          }).then((value) => f.set(R.ORDER_LINE, value, (line) => OrderLines.deleteOrderLineViaApi(line.id, false)));
        })
        .step((f) => {
          return Orders.updateOrderViaApi({
            ...f.get(R.ORDER),
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        })
        .step((f) => {
          // Precondition 2: Integration method with wrong Server address (sftp://) to produce 'Failed' job
          const fireAt = moment().add(JOB_TRIGGER_DELAY_MIN, 'minutes');
          const integration = Integrations.getDefaultIntegration({
            vendorId: f.get(R.ORGANIZATION).id,
            acqMethodId: f.get(R.ACQUISITION_METHOD).id,
            accountNoList: [organization.accounts[0].accountNo],
            integrationName: `AT_C365604_ORG_INT_${getRandomPostfix()}`,
            ediFtp: { serverAddress: WRONG_FTP_SERVER_ADDRESS },
            scheduleTime: formatIntlDateTime(f.get(R.LOCALE), fireAt.toISOString(), {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }),
          });

          f.set(R.INTEGRATION_FIRE_AT, fireAt.valueOf());
          return Integrations.createIntegrationViaApi(integration)
            .then(() => Integrations.getIntegrationConfigViaApi(integration.id))
            .then((value) => f.set(R.INTEGRATION, value, (config) => Integrations.deleteIntegrationViaApi(config.id)));
        })
        .step(() => {
          // Precondition 4: Wait for the scheduled job to run and produce 'Failed' status
          cy.wait(flow.get(R.INTEGRATION_FIRE_AT) - Date.now() + DEFAULT_WAIT_TIME);
        })
        .step((f) => {
          return Exports.getExportJobsViaApi({
            query: `jsonb.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.exportConfigId=="${f.get(R.INTEGRATION).id}"`,
          }).then(({ jobRecords }) => flow.set(R.JOB, jobRecords[0]));
        })
        .step((f) => {
          // Precondition 6: User with required permissions is created
          return cy
            .createTempUser(USER_PERMISSIONS)
            .then((user) => f.set(R.USER, user, (value) => Users.deleteViaApi(value.userId)));
        })
        .step((f) => {
          // Precondition 7: User is in 'Export manager' app
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.exportManagerPath,
            waiter: ExportManagerSearchPane.waitLoading,
          });
        });
    });

    after('Delete C365604 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C365604 Resend the exact ".edi" file that was exported for a given export job with "Failed" status (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C365604'] },
      () => {
        cy.log('<--- STEP 1 --->');
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.waitLoading();

        cy.log('<--- STEP 2 --->');
        ExportManagerSearchPane.searchByFailed();
        ExportManagerSearchPane.verifyResult(EXPORT_MANAGER_JOBS_STATUS_LABELS.FAILED);

        cy.log('<--- STEP 3 --->');
        flow.step((f) => {
          const job = f.get(R.JOB);
          const integrationName = getIntegrationName(flow.get(R.INTEGRATION));

          ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);
          ExportDetails.waitLoading();

          ExportDetails.verifyJobLabels();
          ExportDetails.checkExportJobDetails({
            exportInformation: [
              { key: JOB_ID, value: job.name },
              { key: ORGANIZATION, value: f.get(R.ORGANIZATION).name },
              { key: EXPORT_METHOD, value: integrationName },
              { key: FILE_NAME, value: job.fileNames[0] },
              { key: STATUS, value: EXPORT_MANAGER_JOB_STATUS_MAPPING[job.status] },
              { key: SOURCE, value: job.isSystemSource ? USER_TYPES.SYSTEM : job.source },
              { key: ERROR_DETAILS, value: job.errorDetails || '-' },
              { key: SENT_TO, value: getSentToValue(job) },
              { key: START_TIME, value: formatDateTime(f.get(R.LOCALE), job.startTime) },
              { key: END_TIME, value: formatDateTime(f.get(R.LOCALE), job.endTime) },
            ],
          });
        });

        cy.log('<--- STEP 4 --->');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
        Organizations.waitLoading();

        flow.step((f) => {
          Organizations.searchByParameters(
            ORGANIZATION_SEARCH_OPTIONS.NAME,
            f.get(R.ORGANIZATION).name,
          );
          Organizations.selectOrganization(f.get(R.ORGANIZATION).name);
        });

        cy.log('<--- STEP 5-6 --->');
        flow.step((f) => {
          OrganizationDetails.selectIntegration(getIntegrationName(f.get(R.INTEGRATION)));
        });

        cy.log('<--- STEP 7 --->');
        IntegrationViewForm.openIntegrationEditForm();

        cy.log('<--- STEP 8 --->');
        flow.step((f) => {
          const resendFireAt = moment().add(RESEND_TRIGGER_DELAY_MIN, 'minutes');

          IntegrationEditForm.fillServerAddress(CORRECT_FTP_SERVER_ADDRESS);
          IntegrationEditForm.updateScheduleOptions({
            period: SCHEDULE_PERIOD_DAILY,
            time: formatIntlDateTime(f.get(R.LOCALE), resendFireAt.toISOString(), {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
          });
          f.set(R.RESEND_FIRE_AT, resendFireAt.valueOf());
        });

        cy.log('<--- STEP 9 --->');
        IntegrationEditForm.clickSaveButton();

        cy.log('<--- STEP 10 --->');
        flow.step((f) => {
          cy.wait(f.get(R.RESEND_FIRE_AT) - Date.now() + DEFAULT_WAIT_TIME);
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
        ExportManagerSearchPane.resetAll();
        ExportManagerSearchPane.searchBySuccessful();

        flow.step((f) => {
          const integrationName = getIntegrationName(f.get(R.INTEGRATION));

          ExportManagerSearchPane.filterByExportMethod(integrationName);
          ExportManagerSearchPane.verifyResult(EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL);
          ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);
          ExportDetails.waitLoading();
        });
        ExportManagerSearchPane.resendJob({ waitMs: 0 });
        ExportManagerSearchPane.verifyResendFileUploadStarted();

        // Steps 11-12: Verify resent file in FTP via Filezilla — requires manual FTP client, not automatable in Cypress
      },
    );
  });
});
