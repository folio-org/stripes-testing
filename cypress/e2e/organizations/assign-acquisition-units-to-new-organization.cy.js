import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationDetails from '../../support/fragments/organizations/organizationDetails';
import { ORGANIZATION_DETAILS_FIELDS } from '../../support/constants';
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
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
        cy.createTempUser([
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsAssignAcquisitionUnitsToNewOrganization.gui,
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

  after(() => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.unAssignUserViaApi(testData.membershipId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C1045979 Organizations: Assign acquisition units to new organization (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1045979'] },
    () => {
      // Create a new organization with acquisition unit
      Organizations.createOrganizationWithAU(testData.organization, testData.acqUnit.name);
      Organizations.verifySaveOrganizationCalloutMessage(testData.organization);

      // Capture organization id from url
      cy.url().then((url) => {
        testData.organization.id = url.match(/organizations\/view\/([^/]+)/)?.[1] || null;
      });

      // Check created organization details
      OrganizationDetails.waitLoading();
      OrganizationDetails.checkOrganizationDetails([
        { key: ORGANIZATION_DETAILS_FIELDS.NAME, value: testData.organization.name },
        { key: ORGANIZATION_DETAILS_FIELDS.CODE, value: testData.organization.code },
        {
          key: ORGANIZATION_DETAILS_FIELDS.ORGANIZATION_STATUS,
          value: testData.organization.status,
        },
        { key: ORGANIZATION_DETAILS_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
      ]);

      // Edit organization and check acquisition unit selection is disabled
      Organizations.editOrganization();
      Organizations.verifyAcqUnitSelectionDisabled();
      Organizations.verifyAcqUnitSelected(testData.acqUnit.name);
    },
  );
});
