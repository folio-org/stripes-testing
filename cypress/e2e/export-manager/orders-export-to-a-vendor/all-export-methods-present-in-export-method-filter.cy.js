import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const NUMBER_OF_INTEGRATIONS = 11;
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: NUMBER_OF_INTEGRATIONS }),
      integrations: [],
      integrationNames: [],
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            const integrationPromises = testData.organization.accounts.map((account) => {
              const integration = Integrations.getDefaultIntegration({
                vendorId: testData.organization.id,
                acqMethodId: acqMethod.id,
                accountNoList: [account.accountNo],
              });
              testData.integrations.push(integration);
              testData.integrationNames.push(
                integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
              );
              return Integrations.createIntegrationViaApi(integration);
            });

            return Cypress.Promise.all(integrationPromises);
          });
        });
      });

      cy.createTempUser([Permissions.exportManagerAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.integrations.forEach((integration) => {
        Integrations.deleteIntegrationViaApi(integration.id);
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359175 All existing export methods are present in the Export method list on "Search & filter" pane (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C359175'] },
      () => {
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.checkTabHighlighted({ tabName: 'Organizations' });

        ExportManagerSearchPane.verifyExportMethodAccordion({ verifyEmpty: true });

        ExportManagerSearchPane.openExportMethodDropdown();
        ExportManagerSearchPane.verifyExportMethodDropdownContainsIntegrations(
          testData.integrationNames,
        );
      },
    );
  });
});
