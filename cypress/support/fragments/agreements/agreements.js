import {
  Accordion,
  Button,
  HTML,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
  or,
  SearchField,
} from '../../../../interactors';
import { REQUEST_METHOD } from '../../constants';
import DateTools from '../../utils/dateTools';
import getRandomPostfix, { randomFourDigitNumber } from '../../utils/stringTools';
import NewAgreement from './newAgreement';
import SearchAndFilterAgreements from './searchAndFilterAgreements';
import SearchHelper from '../finance/financeHelper';

const agreementsSection = Section({ id: 'agreements-tab-pane' });
const agreementsViewSection = Section({ id: 'pane-view-agreement' });
const newButton = Button('New');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const actionsButton = Button('Actions');
const controllingLicense = Accordion({ id: 'controllingLicense' });
const organizationSection = Accordion({ id: 'formOrganizations' });
const addOrganizationButton = Button({ id: 'add-org-btn' });
const linkOrganizationButton = Button({ name: 'orgs[0].org.orgsUuid' });
const searchButtonInModal = Button('Search');
const agreementsToggleButton = Button({ id: 'clickable-nav-agreements' });

const waitLoading = () => {
  cy.expect(
    or(
      agreementsSection.find(MultiColumnListRow()).exists(),
      agreementsSection
        .find(HTML(including('No results found. Please check your filters.')))
        .exists(),
    ),
    agreementsSection.find(actionsButton).exists(),
  );
  cy.do(
    agreementsToggleButton.perform((element) => {
      expect(element.classList[2]).to.include('primary');
    }),
  );
};

const defaultAgreement = {
  periods: [
    {
      startDate: DateTools.getCurrentDateForFiscalYear(),
    },
  ],
  name: `AT_Agreement_${getRandomPostfix()}`,
  agreementStatus: 'active',
};

const defaultAgreementWithOrg = ({ organizationId, organizationName }) => {
  return {
    periods: [
      {
        startDate: DateTools.getCurrentDateForFiscalYear(),
      },
    ],
    name: `AutotestAgreement ${randomFourDigitNumber()}`,
    agreementStatus: 'active',
    orgs: [
      {
        org: {
          name: organizationName,
          orgsUuid: organizationId,
        },
        roles: [
          {
            role: {
              value: 'content_provider',
            },
          },
        ],
      },
    ],
  };
};

const agreementWithLinkedUser = (userId) => {
  return {
    periods: [
      {
        startDate: DateTools.getCurrentDateForFiscalYear(),
      },
    ],
    name: `AutotestAgreement' ${randomFourDigitNumber()}`,
    agreementStatus: 'active',
    contacts: [
      {
        user: userId,
        role: 'subject_specialist',
      },
    ],
  };
};

export default {
  waitLoading,
  defaultAgreement,
  defaultAgreementWithOrg,
  agreementWithLinkedUser,

  create: (specialAgreement) => {
    cy.do(agreementsSection.find(actionsButton).click());
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
  },

  createAndCheckFields: (specialAgreement) => {
    cy.do([agreementsSection.find(actionsButton).click(), newButton.click()]);
    NewAgreement.waitLoading();
    NewAgreement.checkSelectFields();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
  },

  editAgreement() {
    cy.do(agreementsViewSection.find(actionsButton).click());
    cy.do(editButton.click());
  },

  deleteAgreement() {
    cy.do(agreementsViewSection.find(actionsButton).click());
    cy.do(deleteButton.click());
    cy.do(deleteButton.click());
  },

  createViaApi: (agreement = defaultAgreement) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'erm/sas',
        body: agreement,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  deleteViaApi: (agreementId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `erm/sas/${agreementId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  getIdViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: 'erm/sas',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body[0].id;
      });
  },

  switchToLocalKBSearch() {
    cy.do(Button('Local KB search').click());
  },

  selectRecord: (agreementTitle) => {
    cy.expect(agreementsSection.find(MultiColumnListCell(agreementTitle)).exists());
    cy.do(agreementsSection.find(MultiColumnListCell(agreementTitle)).click());
  },

  agreementNotVisible: (agreementTitle) => cy.expect(agreementsSection.find(MultiColumnListCell(agreementTitle)).absent()),

  checkAgreementPresented: (name) => {
    SearchAndFilterAgreements.search(name);
    cy.expect(MultiColumnListCell(name).exists());
  },

  checkControllingLicenseDisplayed() {
    cy.expect(controllingLicense.exists());
  },

  checkSwitchToLocalKbDisplayed() {
    // using xpath to be able to run this on tenans with non-english localization
    cy.xpath("//a[@href='/erm/packages']").should('be.visible');
  },

  addOrganization: (organization) => {
    cy.do([
      organizationSection.find(addOrganizationButton).click(),
      linkOrganizationButton.click(),
      SearchField({ id: 'input-record-search' }).fillIn(organization.name),
      searchButtonInModal.click(),
    ]);
    cy.wait(6000);
    SearchHelper.selectFromResultsList();
    cy.get('select[data-test-org-role-field]')
      .find('option:not([disabled])')
      .first()
      .then((option) => {
        cy.get('select[data-test-org-role-field]').select(option.val());
      });
    NewAgreement.save();
  },
};
