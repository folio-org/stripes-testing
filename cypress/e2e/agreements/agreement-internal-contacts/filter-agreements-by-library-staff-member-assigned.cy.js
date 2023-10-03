import { including } from '@interactors/html';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { TestTypes, DevTeams } from '../../../support/dictionary';
import SearchAndFilterAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';

let agreement;
let agreementId;
const user = {
  active: true,
  username: `firstUserName ${randomFourDigitNumber()}`,
  personal: {
    preferredContactTypeId: '002',
    firstName: 'firstUserFirstName',
    middleName: 'firstUserMiddleName',
    lastName: 'firstUserLastName',
    email: 'test@folio.org',
  },
  departments: [],
};
let userId;

describe('Agreement Internal Contacts', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    Users.createViaApi(user)
      .then((userData) => {
        userId = userData.id;
      })
      .then(() => {
        agreement = Agreements.agreementWithLinkedUser(userId);
        Agreements.createViaApi(agreement).then((agr) => {
          agreementId = agr.id;
        });
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(userId);
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C3460 Filter agreements by library staff member assigned (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      SearchAndFilterAgreements.openInternalContactsFilter();
      SearchAndFilterAgreements.clickSelectInternalContactButton();
      SearchAndFilterAgreements.filterContactByName(user.personal.lastName);
      SearchAndFilterAgreements.selectContactName(including(user.personal.lastName));
      Agreements.checkAgreementPresented(agreement.name);
    },
  );
});
