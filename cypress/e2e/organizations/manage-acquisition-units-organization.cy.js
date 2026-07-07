import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationDetails from '../../support/fragments/organizations/organizationDetails';
import { ORGANIZATION_DETAILS_FIELDS, ORGANIZATION_SEARCH_OPTIONS } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const testData = {
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
    organization: NewOrganization.getDefaultOrganization(),
    user: {},
    membershipId: null,
  };

  before(() => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then((orgId) => {
        testData.organization.id = orgId;

        AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
          cy.createTempUser([
            Permissions.uiOrganizationsViewEditCreate.gui,
            Permissions.uiOrganizationsManageAcquisitionUnits.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id).then(
              (membershipId) => {
                testData.membershipId = membershipId;

                cy.login(userProperties.username, userProperties.password, {
                  path: TopMenu.organizationsPath,
                  waiter: Organizations.waitLoading,
                });
              },
            );
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.unAssignUserViaApi(testData.membershipId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C1045980 Organizations: Manage acquisition units (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1045980'] },
    () => {
      // Search for the organization and assign acquisition unit
      Organizations.searchByParameters(
        ORGANIZATION_SEARCH_OPTIONS.NAME,
        testData.organization.name,
      );
      Organizations.selectOrganization(testData.organization.name);
      OrganizationDetails.waitLoading();
      Organizations.editOrganization();
      Organizations.addAU([testData.acqUnit.name]);
      Organizations.saveOrganization();
      Organizations.verifySaveOrganizationCalloutMessage(testData.organization);

      // Check edited organization details
      OrganizationDetails.waitLoading();
      OrganizationDetails.checkOrganizationDetails([
        { key: ORGANIZATION_DETAILS_FIELDS.NAME, value: testData.organization.name },
        { key: ORGANIZATION_DETAILS_FIELDS.ACCOUNTING_CODE, value: testData.organization.erpCode },
        { key: ORGANIZATION_DETAILS_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
      ]);

      // Create a new organization and check acquisition unit selection is disabled
      Organizations.newOrganization();
      Organizations.verifyAcqUnitSelectionDisabled();
    },
  );
});
