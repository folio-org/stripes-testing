import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  or,
  including,
  HTML,
} from '../../../../interactors';
import NewAgreement from './newAgreement';
import AgreementDetails from './agreementsDetails';
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
    }
  ],
  name: `AutotestAgreement' ${randomFourDigitNumber()}`,
  agreementStatus: 'active'
};

export default {
  waitLoading,
  defaultAgreement,

  create: (specialAgreement) => {
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
    waitLoading();
  },

  createViaApi: (agreement = defaultAgreement) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'erm/sas',
        body: agreement,
        isDefaultSearchParamsRequired: false
      })
      .then((response) => response.body);
  },

  deleteViaApi: (agreementId) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `erm/sas/${agreementId}`,
        isDefaultSearchParamsRequired: false
      });
  },
  selectRecord: (agreementTitle) => {
    cy.do(section.find(MultiColumnListCell(agreementTitle)).click());
    AgreementDetails.waitLoading();
  },

  agreementNotVisible: (agreementTitle) => cy.expect(section.find(MultiColumnListCell(agreementTitle)).absent()),
};
