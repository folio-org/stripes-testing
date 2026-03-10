import moment from 'moment';
import permissions from '../../../support/dictionary/permissions';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Integrations from '../../../support/fragments/organizations/integrations/integrations';
import IntegrationEditForm from '../../../support/fragments/organizations/integrations/integrationEditForm';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
    };
    const now = moment();
    let integrationName;
    let integration;
    let user;
    let location;
    let servicePointId;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;
        });
      });

      Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
        organization.id = organizationsResponse;

        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        }).then(({ body: { acquisitionMethods } }) => {
          const acqMethod = acquisitionMethods.find(
            ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
          );

          now.set('second', now.second() + 10);
          integration = Integrations.getDefaultIntegration({
            vendorId: organization.id,
            acqMethodId: acqMethod.id,
            ediSchedule: {
              enableScheduledExport: true,
              scheduleParameters: {
                schedulePeriod: 'WEEK',
                scheduleFrequency: 1,
                scheduleTime: now.utc().format('HH:mm:ss'),
                weekDays: ['SUNDAY'],
              },
            },
            ediFtp: {
              ftpFormat: 'SFTP',
              serverAddress: 'sftp://ftp.ci.folio.org',
              orderDirectory: '/ftp/files/orders',
            },
            scheduleTime: now.utc().format('HH:mm:ss'),
            isDefaultConfig: true,
          });
          integrationName =
            integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
          Integrations.createIntegrationViaApi(integration);
        });
      });
      cy.createTempUser([
        permissions.exportManagerAll.gui,
        permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
        permissions.uiOrganizationsViewEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(organization.id);
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        location.institutionId,
        location.campusId,
        location.libraryId,
        location.id,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359200 Days previously chosen for weekly scheduling are NOT displaying in new current scheduling settings (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C359200'] },
      () => {
        OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
        Organizations.checkSearchResults(organization);
        Organizations.selectOrganization(organization.name);
        Organizations.selectIntegration(integrationName);
        Organizations.editIntegration();
        IntegrationEditForm.selectSchedulingDay('SUNDAY');
        IntegrationEditForm.selectSchedulingDay('MONDAY');
        IntegrationEditForm.clickSaveButton();
        Organizations.closeIntegrationDetailsPane();
        Organizations.selectIntegration(integrationName);
        Organizations.checkSelectedDayInIntegration('Sunday', false);
        Organizations.checkSelectedDayInIntegration('Monday', true);
      },
    );
  });
});
