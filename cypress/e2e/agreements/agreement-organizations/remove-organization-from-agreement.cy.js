import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import EditAgreement from '../../../support/fragments/agreements/editAgreement';
import { TestTypes, DevTeams } from '../../../support/dictionary';

let agreementId;
let agreement;
const organization = { ...NewOrganization.defaultUiOrganizations };
describe('Agreement Organizations', () => {
  before('create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then((response) => {
        organization.id = response;
      })
      .then(() => {
        agreement = Agreements.defaultAgreementWithOrg({
          organizationId: organization.id,
          organizationName: organization.name,
        });
        Agreements.createViaApi(agreement).then((agr) => {
          agreementId = agr.id;
        });
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after('delete test data', () => {
    Organizations.deleteOrganizationViaApi(organization.id);
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C1329 Remove an Organization record from an Agreement record (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(agreement.name);
      AgreementViewDetails.verifyOrganizationsAccordion(true);
      AgreementViewDetails.verifyOrganizationsCount('1');

      AgreementViewDetails.openOrganizationsSection();
      AgreementViewDetails.verifyOrganizationCardIsShown(organization.name);

      AgreementViewDetails.gotoEdit();
      EditAgreement.removeOrganization();
      EditAgreement.saveAndClose();
      AgreementViewDetails.verifyOrganizationsAccordion(false);
    },
  );
});
