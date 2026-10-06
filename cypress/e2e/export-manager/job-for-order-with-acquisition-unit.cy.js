import moment from 'moment';

import {
  ACCOUNT_STATUSES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DEFAULT_WAIT_TIME,
  EXPORT_MANAGER_EDI_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  LOCATION_NAMES,
  ORDER_LINE_DISCOUNT_TYPES,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  ORGANIZATION_PAYMENT_METHODS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Integrations from '../../support/fragments/organizations/integrations/integrations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import { CURRENCIES } from '../../support/fragments/settings/tenant/general/localization';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { formatIntlDateTime } from '../../support/utils/acquisitions';

const ACCOUNT_DESCRIPTION = 'Main library account';
const ACCOUNT_LIBRARY_CODE = 'COB';
const ACCOUNT_NAME = 'TestAccount';
const EXPORT_JOB_STATUS = EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL;
const USER_PERMISSIONS = [
  Permissions.exportManagerAll.gui,
  Permissions.uiOrdersView.gui,
  Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
  Permissions.uiOrganizationsViewEdit.gui,
];
const JOB_TRIGGER_DELAY_MIN = 1; // Test case say 2 minutes, but the downtime for the automated test is too long

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const acquisitionUnit = {
        ...AcquisitionUnits.defaultAcquisitionUnit,
        protectDelete: true,
        protectUpdate: true,
        protectCreate: true,
        protectRead: true,
      };
      const order = {
        ...NewOrder.defaultOneTimeOrder,
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
            description: ACCOUNT_DESCRIPTION,
            libraryCode: ACCOUNT_LIBRARY_CODE,
            libraryEdiCode: getRandomPostfix(),
            name: ACCOUNT_NAME,
            notes: '',
            paymentMethod: ORGANIZATION_PAYMENT_METHODS.CASH,
          },
        ],
      };
      const flow = new ExecutionFlowManager();
      const R = {
        ACQUISITION_METHOD: 'acquisitionMethod',
        ACQUISITION_UNIT: 'acquisitionUnit',
        ADMIN_MEMBERSHIP: 'adminMembership',
        INTEGRATION: 'integration',
        INTEGRATION_FIRE_AT: 'integrationFireAt',
        LOCALE: 'locale',
        LOCATION: 'location',
        MATERIAL_TYPE: 'materialType',
        ORDER: 'order',
        ORDER_LINE: 'orderLine',
        ORGANIZATION: 'organization',
        USER: 'user',
        USER_MEMBERSHIP: 'userMembership',
      };

      before(() => {
        cy.getAdminToken();
        cy.clearLocalStorage();
        cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

        flow
          .step((f) => cy
            .createTempUser(USER_PERMISSIONS)
            .then((user) => f.set(R.USER, user, (value) => Users.deleteViaApi(value.userId))))
          .step((f) => Organizations.createOrganizationViaApi(organization).then((id) => {
            organization.id = id;
            order.vendor = id;
            return f.set(R.ORGANIZATION, organization, (value) => Organizations.deleteOrganizationViaApi(value.id));
          }))
          .step((f) => cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            })
            .then(({ body }) => f.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0])))
          .step((f) => cy
            .getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` })
            .then((location) => f.set(R.LOCATION, location)))
          .step((f) => MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
            ({ body }) => f.set(R.MATERIAL_TYPE, body, (value) => MaterialTypes.deleteViaApi(value.id)),
          ))
          .step((f) => AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((value) => f.set(R.ACQUISITION_UNIT, value, (unit) => AcquisitionUnits.deleteAcquisitionUnitViaApi(unit.id, false))))
          .step((f) => AcquisitionUnits.assignUserViaApi(
            f.get(R.USER).userId,
            f.get(R.ACQUISITION_UNIT).id,
          ).then((id) => f.set(R.USER_MEMBERSHIP, id, (membershipId) => AcquisitionUnits.unAssignUserViaApi(membershipId))))
          .step((f) => cy
            .getAdminUserDetails()
            .then((adminUser) => AcquisitionUnits.assignUserViaApi(adminUser.id, f.get(R.ACQUISITION_UNIT).id).then(
              (id) => f.set(R.ADMIN_MEMBERSHIP, id, (membershipId) => AcquisitionUnits.unAssignUserViaApi(membershipId)),
            )))
          .step((f) => cy
            .createOrderApi({
              ...order,
              acqUnitIds: [f.get(R.ACQUISITION_UNIT).id],
            })
            .then(({ body }) => f.set(R.ORDER, body, (value) => Orders.deleteOrderViaApi(value.id, false))))
          .step((f) => OrderLines.createOrderLineViaApi({
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
          }).then((value) => f.set(R.ORDER_LINE, value, (line) => OrderLines.deleteOrderLineViaApi(line.id, false))))
          .step((f) => Orders.updateOrderViaApi({ ...f.get(R.ORDER), workflowStatus: ORDER_STATUSES.OPEN }))
          .step((f) => {
            const fireAt = moment().add(JOB_TRIGGER_DELAY_MIN, 'minutes');
            const integration = Integrations.getDefaultIntegration({
              vendorId: f.get(R.ORGANIZATION).id,
              acqMethodId: f.get(R.ACQUISITION_METHOD).id,
              accountNoList: [organization.accounts[0].accountNo],
              integrationName: `AT_C380640_ORG_INT_${getRandomPostfix()}`,
              integrationType: ORGANIZATION_INTEGRATION_CONFIG.INTEGRATION_TYPES.ORDERING,
              type: ORGANIZATION_INTEGRATION_CONFIG.EXPORT_TYPES.EDIFACT_ORDERS,
              fileFormat: ORGANIZATION_INTEGRATION_CONFIG.FILE_FORMATS.EDI,
              isDefaultConfig: true,
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
            /* Wait until the scheduled fire time, then poll until the job row appears */
            cy.wait(flow.get(R.INTEGRATION_FIRE_AT) - Date.now() + DEFAULT_WAIT_TIME);
          })
          .step((f) => cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.exportManagerPath,
            waiter: ExportManagerSearchPane.waitLoading,
          }));
      });

      after(() => {
        cy.getAdminToken();
        flow.cleanup();
      });

      it(
        'C380640 Schedule export job for order with Acquisition unit (thunderjet) (TaaS)',
        { tags: ['extendedPath', 'thunderjet', 'C380640'] },
        () => {
          const { integration } = flow.ctx();
          const integrationName =
            integration.integrationName ||
            integration.name ||
            integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;

          cy.log('Step 1. Open the Organizations export jobs view');
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.waitLoading();

          cy.log('Step 2. Filter jobs by the configured export method');
          ExportManagerSearchPane.filterByExportMethod(integrationName);
          ExportManagerSearchPane.verifyResult(EXPORT_JOB_STATUS);

          cy.log('Step 3. Open the scheduled successful export job and verify its details');
          ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);
          ExportDetails.waitLoading();
          ExportManagerSearchPane.verifyJobStatusInDetailView(EXPORT_JOB_STATUS);
          ExportManagerSearchPane.verifyJobOrganizationInDetailView(flow.get(R.ORGANIZATION));
          ExportManagerSearchPane.verifyJobExportMethodInDetailView(integrationName);
          ExportDetails.verifyJobLabels([EXPORT_MANAGER_EDI_JOB_FIELD_LABELS.FILE_NAME]);
        },
      );
    });
  });
});
