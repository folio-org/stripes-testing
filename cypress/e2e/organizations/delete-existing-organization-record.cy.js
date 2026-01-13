import { Permissions } from '../../support/dictionary';
import {
  NewOrganization,
  Organizations,
  OrganizationDetails,
} from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ConfirmDeleteOrganizationModal from '../../support/fragments/organizations/modals/confirmDeleteOrganizationModal';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([Permissions.uiOrganizationsViewEditDelete.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C674 Delete existing organization record (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C674'] },
    () => {
      // Step 1: Open organization from "Preconditions" details pane
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);

      // Step 2: Click "Actions" button on organization from "Preconditions" details pane and select "Delete" option
      Organizations.deleteOrganization(false);
      ConfirmDeleteOrganizationModal.waitLoading();
      ConfirmDeleteOrganizationModal.verifyModalView(organization.name);

      // Step 3: Click "Cancel" button on "Delete <Organization name>?" popup
      ConfirmDeleteOrganizationModal.clickCancel();
      ConfirmDeleteOrganizationModal.isNotDisplayed();

      // Step 4: Click "Actions" button on organization from "Preconditions" details pane and select "Delete" option
      Organizations.deleteOrganization(false);
      ConfirmDeleteOrganizationModal.waitLoading();
      ConfirmDeleteOrganizationModal.verifyModalView(organization.name);

      // Step 5: Click "Delete" button on "Delete <Organization name>?" popup
      ConfirmDeleteOrganizationModal.clickDeleteButton();
      InteractorsTools.checkCalloutMessage(
        `The organization ${organization.name} was successfully deleted`,
      );
      OrganizationDetails.organizationDetailsSectionIsAbsent();
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkZeroSearchResultsHeader();
    },
  );
});
