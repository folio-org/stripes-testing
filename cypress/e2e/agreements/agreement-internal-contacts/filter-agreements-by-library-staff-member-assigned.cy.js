import { including } from '@interactors/html';
import Agreements from '../../../support/fragments/agreements/agreements';
import SearchAndFilterAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomNDigitNumber } from '../../../support/utils/stringTools';

let agreement;
let agreementId;
const randomDigits = `3460${randomNDigitNumber(10)}`;
const user = {
  active: true,
  username: `at_c3460_user_first_${randomDigits}`,
  personal: {
    preferredContactTypeId: '002',
    firstName: `firstUserFirstName_${randomDigits}`,
    middleName: `firstUserMiddleName_${randomDigits}`,
    lastName: `firstUserLastName_${randomDigits}`,
    email: `test_${randomDigits}@folio.org`,
  },
  departments: [],
};
let userId;

describe('agreements', () => {
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
      cy.getAdminToken();
      Users.deleteViaApi(userId);
      Agreements.deleteViaApi(agreementId);
    });

    it(
      'C3460 Filter agreements by library staff member assigned (erm) (TaaS)',
      { tags: ['extendedPathErm', 'erm'] },
      () => {
        SearchAndFilterAgreements.openInternalContactsFilter();
        SearchAndFilterAgreements.clickSelectInternalContactButton();
        SearchAndFilterAgreements.filterContactByName(user.personal.lastName);
        SearchAndFilterAgreements.selectContactName(including(user.personal.lastName));
        Agreements.checkAgreementPresented(agreement.name);
      },
    );
  });
});
