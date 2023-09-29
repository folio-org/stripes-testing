import { HTML } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  or,
  including,
} from '../../../../interactors';
import NewAgreement from './newAgreement';
import SearchAndFilterAgreements from './searchAndFilterAgreements';
import { REQUEST_METHOD } from '../../constants';
import DateTools from '../../utils/dateTools';
import { randomFourDigitNumber } from '../../utils/stringTools';

const section = Section({ id: 'pane-agreement-list' });
const newButton = Button('New');

const waitLoading = () => {
  cy.expect(
    or(
      section.find(MultiColumnListRow()).exists(),
      section.find(HTML(including('No results found. Please check your filters.'))).exists(),
    ),
  );
  cy.expect(newButton.exists());
};

const defaultAgreement = {
  periods: [
    {
      startDate: DateTools.getCurrentDateForFiscalYear(),
    },
  ],
  name: `Default Agreement ${randomFourDigitNumber()}`,
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
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
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
    cy.do(section.find(MultiColumnListCell(agreementTitle)).click());
  },

  agreementNotVisible: (agreementTitle) => cy.expect(section.find(MultiColumnListCell(agreementTitle)).absent()),

  checkAgreementPresented: (name) => {
    SearchAndFilterAgreements.search(name);
    cy.expect(MultiColumnListCell(name).exists());
  },
};
